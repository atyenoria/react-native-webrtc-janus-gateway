import React, { Component } from 'react';
import {
  AppRegistry,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
  TextInput,
  ListView,
  ScrollView,
  Dimensions,
  Image
} from 'react-native';

import {
  RTCPeerConnection,
  RTCMediaStream,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  RTCVideoView,
  MediaStreamTrack,
  getUserMedia,
} from 'react-native-webrtc';

import Janus from './janus.mobile.js';
import config from './config.js';
import InCallManager from 'react-native-incall-manager';

import Spinner from 'react-native-loading-spinner-overlay';
import { Icon } from 'react-native-elements'
import TabNavigator from 'react-native-tab-navigator';

let server = config.JanusWssHost

let janus;
let sfutest = null;
let started = false;

let myusername = Math.floor(Math.random() * 1000);
let roomId = 1234
let myid = null;
let mystream = null;

let feeds = [];
var bitrateTimer = [];

Janus.init({debug: "all", callback: function() {
        if(started)
            return;
        started = true;
}});

const pcPeers = {};


function getStats() {
  const pc = pcPeers[Object.keys(pcPeers)[0]];
  if (pc.getRemoteStreams()[0] && pc.getRemoteStreams()[0].getAudioTracks()[0]) {
    const track = pc.getRemoteStreams()[0].getAudioTracks()[0];
    console.log('track', track);
    pc.getStats(track, function(report) {
      console.log('getStats report', report);
    }, logError);
  }
}

class reactNativeJanusWebrtcGateway extends Component{

    constructor(props) {
        super(props);
        this.ds = new ListView.DataSource({rowHasChanged: (r1, r2) => true});
        this.state ={ 
            info: 'Initializing',
            status: 'init',
            roomID: '',
            isFront: true,
            selfViewSrc: null,
            selfViewSrcKey: null,
            remoteList: {},
            remoteListPluginHandle: {},
            textRoomConnected: false,
            textRoomData: [],
            textRoomValue: '',
            publish: false,
            speaker: false,
            visible: false
        };
    } 

  componentDidMount(){
    
    InCallManager.start({ media: 'audio' });
    this.janusStart()
  }

  janusStart = () => {
    this.setState({visible: true});
    janus = new Janus(
        {
            server: server,
            success: () => {
                janus.attach(
                    {
                        plugin: "janus.plugin.videoroom",
                        success: (pluginHandle) => {
                            sfutest = pluginHandle;
                            Janus.log("Plugin attached! (" + sfutest.getPlugin() + ", id=" + sfutest.getId() + ")");
                            Janus.log("  -- This is a publisher/manager");
                                    var register = { "request": "join", "room": roomId, "ptype": "publisher", "display": myusername.toString() };
                                    sfutest.send({"message": register});
                                    console.log("send msg join room")
                        },
                        error: (error) => {
                            Janus.error("  -- Error attaching plugin...", error);
                        },
                        consentDialog: (on) => {
                        },
                        mediaState: (medium, on) => {
                            Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
                        },
                        webrtcState: (on) => {
                            Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                        },
                        onmessage: (msg, jsep) => {
                            console.log(msg)
                            Janus.debug(" ::: Got a message (publisher) :::");
                            Janus.debug(JSON.stringify(msg));
                            var event = msg["videoroom"];
                            Janus.debug("Event: " + event);
                            if(event != undefined && event != null) {
                                if(event === "joined") {
                                    // Publisher/manager created, negotiate WebRTC and attach to existing feeds, if any
                                    myid = msg["id"];
                                    Janus.log("Successfully joined room " + msg["room"] + " with ID " + myid);
                                    this.publishOwnFeed(true);
                                    this.setState({visible: false});
                                    // Any new feed to attach to?
                                    if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                        var list = msg["publishers"];
                                        Janus.debug("Got a list of available publishers/feeds:");
                                        Janus.debug(list);
                                        for(var f in list) {
                                            var id = list[f]["id"];
                                            var display = list[f]["display"];
                                            Janus.debug("  >> [" + id + "] " + display);
                                            this.newRemoteFeed(id, display)
                                        }
                                    }
                                } else if(event === "destroyed") {
                                    Janus.warn("The room has been destroyed!");
                                } else if(event === "event") {
                                    // Any new feed to attach to?
                                    if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                        var list = msg["publishers"];
                                        for(var f in list) {
                                            let id = list[f]["id"]
                                            let display = list[f]["display"]
                                            this.newRemoteFeed(id, display)
                                        }  
                                    } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {                                        
                                        var leaving = msg["leaving"];
                                        Janus.log("Publisher left: " + leaving);
                                        var remoteFeed = null;
                                        let numLeaving = parseInt(msg["leaving"])
                                        
                                        if(this.state.remoteList.hasOwnProperty(numLeaving)){
                                            delete this.state.remoteList.numLeaving
                                            this.setState({remoteList: this.state.remoteList})

                                            this.state.remoteListPluginHandle[numLeaving].detach();
                                            delete this.state.remoteListPluginHandle.numLeaving
                                            
                                        }
                                        
                                    } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                                        // One of the publishers has unpublished?
                                        var unpublished = msg["unpublished"];
                                        Janus.log("Publisher left: " + unpublished);
                                        if(unpublished === 'ok') {
                                            // That's us
                                            sfutest.hangup();
                                            return;
                                        }
                                        
                                        let numLeaving = parseInt(msg["unpublished"])

                                        if(this.state.remoteList.hasOwnProperty(numLeaving)){
                                            delete this.state.remoteList.numLeaving
                                            this.setState({remoteList: this.state.remoteList})

                                            this.state.remoteListPluginHandle[numLeaving].detach();
                                            delete this.state.remoteListPluginHandle.numLeaving
                                            
                                        }

                                    } else if(msg["error"] !== undefined && msg["error"] !== null) {
                                    }
                                }
                            }
                            if(jsep !== undefined && jsep !== null) {
                                Janus.debug("Handling SDP as well...");
                                Janus.debug(jsep);
                                sfutest.handleRemoteJsep({jsep: jsep});
                            }
                        },
                        onlocalstream: (stream) => {
                            this.setState({selfViewSrc: stream.toURL()});
                            this.setState({selfViewSrcKey: Math.floor(Math.random() * 1000)});
                            this.setState({status: 'ready', info: 'Please enter or create room ID'});
                        },
                        onremotestream: (stream) => {
                        },
                        oncleanup: () => {
                            Janus.log(" ::: Got a cleanup notification: we are unpublished now :::");
                            mystream = null;
                           
                        }
                    });
            },
            error: (error) => {
            },
            destroyed: () => {
              console.log("destoryed")
              this.setState({ publish: false });
            //   this.setState({selfViewSrc: null });
            }
        })

  }



    switchVideoType() {
        sfutest.changeLocalCamera();
    }

    toggleAudioMute = () => {
        let muted = sfutest.isAudioMuted();
        if(muted){
            sfutest.unmuteAudio();
        }else{
            sfutest.muteAudio();
        }
    }

    toggleVideoMute = () => {
        let muted = sfutest.isVideoMuted();
        if(muted){
            sfutest.unmuteVideo();
        }else{
            sfutest.muteVideo();
        }
    }

    toggleSpeaker = () => {
        if(this.state.speaker){
            this.setState({speaker: false});
            InCallManager.setForceSpeakerphoneOn(false)
        }else{
            this.setState({speaker: true});
            InCallManager.setForceSpeakerphoneOn(true)
        }
    }

    endCall = () => {
        janus.destroy()
    }
    

    publishOwnFeed(useAudio){
        if(!this.state.publish){
            this.setState({ publish: true });
            sfutest.createOffer(
                {
                    media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true},
                    success: function(jsep) {
                        Janus.debug("Got publisher SDP!");
                        Janus.debug(jsep);
                        var publish = { "request": "configure", "audio": useAudio, "video": true };
                        sfutest.send({"message": publish, "jsep": jsep});
                    },
                    error: function(error) {
                        Janus.error("WebRTC error:", error);
                        if (useAudio) {
                            publishOwnFeed(false);
                        } else {
                        }
                    }
                });
        }else{
            this.setState({ publish: false });
            let unpublish = { "request": "unpublish" };
            sfutest.send({"message": unpublish});
        }
    }

  newRemoteFeed(id, display) {
    let remoteFeed = null;
    janus.attach(
        {
            plugin: "janus.plugin.videoroom",
            success: (pluginHandle) => {
                remoteFeed = pluginHandle;
                Janus.log("Plugin attached! (" + remoteFeed.getPlugin() + ", id=" + remoteFeed.getId() + ")");
                Janus.log("  -- This is a subscriber");
                let listen = { "request": "join", "room": roomId, "ptype": "listener", "feed": id };
                remoteFeed.send({"message": listen});
            },
            error: (error) => {
                Janus.error("  -- Error attaching plugin...", error);
            },
            onmessage: (msg, jsep) => {
                Janus.debug(" ::: Got a message (listener) :::");
                Janus.debug(JSON.stringify(msg));
                let event = msg["videoroom"];
                Janus.debug("Event: " + event);
                if(event != undefined && event != null) {
                    if(event === "attached") {
                        // Subscriber created and attached
                    }
                }
                if(jsep !== undefined && jsep !== null) {
                    Janus.debug("Handling SDP as well...");
                    Janus.debug(jsep);
                    remoteFeed.createAnswer(
                        {
                            jsep: jsep,
                            media: { audioSend: false, videoSend: false },
                            success: (jsep) => {
                                Janus.debug("Got SDP!");
                                Janus.debug(jsep);
                                var body = { "request": "start", "room": roomId };
                                remoteFeed.send({"message": body, "jsep": jsep});
                            },
                            error: (error) => {
                                // Janus.error("WebRTC error:", error);

                            }
                        });
                }
            },
            webrtcState: (on) => {
                Janus.log("Janus says this WebRTC PeerConnection (feed #" + remoteFeed.rfindex + ") is " + (on ? "up" : "down") + " now");
            },
            onlocalstream: (stream) => {
            },
            onremotestream: (stream) => {
                    console.log('onaddstream', stream);
                    this.setState({info: 'One peer join!'});
                    const remoteList = this.state.remoteList;
                    const remoteListPluginHandle = this.state.remoteListPluginHandle;
                    remoteList[id] = stream.toURL();
                    remoteListPluginHandle[id] = remoteFeed
                    this.setState({ remoteList: remoteList, remoteListPluginHandle: remoteListPluginHandle });
            },
            oncleanup: () => {
                Janus.log(" ::: Got a cleanup notification (remote feed " + id + ") :::");
                if(remoteFeed.spinner !== undefined && remoteFeed.spinner !== null)
                    remoteFeed.spinner.stop();
                remoteFeed.spinner = null;
                if(bitrateTimer[remoteFeed.rfindex] !== null && bitrateTimer[remoteFeed.rfindex] !== null)
                    clearInterval(bitrateTimer[remoteFeed.rfindex]);
                bitrateTimer[remoteFeed.rfindex] = null;
            }
        });
    }


  render() {
    return (
    <ScrollView>
        <View style={styles.container}>
            <Text style={styles.welcome}>
            {this.state.info}
            </Text>
            <View style={{flexDirection: 'column'}}>
                <TouchableHighlight
                style={{borderWidth: 1, borderColor: 'black'}}
                onPress={()=>{this.switchVideoType()}} >
                    <Text style={{fontSize: 20}}>Switch Camera</Text>
                </TouchableHighlight>
                <TouchableHighlight
                    style={{borderWidth: 1, borderColor: 'black'}}
                    onPress={()=>{this.toggleAudioMute()}} >
                        <Text style={{fontSize: 20}}>Audio Mute/Unmute</Text>
                </TouchableHighlight>
                <TouchableHighlight
                    style={{borderWidth: 1, borderColor: 'black'}}
                    onPress={()=>{this.toggleVideoMute()}} >
                    <Text style={{fontSize: 20}}>Video Mute/Unmute</Text>
                </TouchableHighlight>
                <TouchableHighlight
                style={{borderWidth: 1, borderColor: 'black'}}
                onPress={()=>{this.publishOwnFeed()}} >
                    <Text style={{fontSize: 20}}>Publish/Unpubish</Text>
                </TouchableHighlight>
                <TouchableHighlight
                style={{borderWidth: 1, borderColor: 'black'}}
                onPress={()=>{this.toggleSpeaker()}} >
                    <Text style={{fontSize: 20}}>Speaker ON/OFF</Text>
                </TouchableHighlight>
                <TouchableHighlight
                style={{borderWidth: 1, borderColor: 'black'}}
                onPress={()=>{this.endCall()}} >
                    <Text style={{fontSize: 20}}>End Call</Text>
                </TouchableHighlight>
                <TouchableHighlight
                style={{borderWidth: 1, borderColor: 'black'}}
                onPress={()=>{this.janusStart()}} >
                    <Text style={{fontSize: 20}}>Recreate Janus Session</Text>
                </TouchableHighlight>
            </View>
            { this.state.selfViewSrc && <RTCView key={this.state.selfViewSrcKey} streamURL={this.state.selfViewSrc} style={styles.remoteView}/>}
            {this.state.remoteList && Object.keys(this.state.remoteList).map((key, index) => {
                return <RTCView key={Math.floor(Math.random() * 1000)} streamURL={this.state.remoteList[key]} style={styles.remoteView}/>
            })
            }
        </View>
        
        <View style={{ flex: 1 }}>
            <Spinner visible={this.state.visible} textContent={"Connecting..."} textStyle={{color: '#FFF'}} />
        </View>
        <View style={{flex: 1, flexDirection: 'row'}}>
            <Icon
                raised
                name='video'
                type='material-community'
                color='#f50'
                onPress={() => console.log('hello')} />
            <Icon
                raised
                name='video-off'
                type='material-community'
                color='#f50'
                onPress={() => console.log('hello')} />
            <Icon
                raised
                name='volume-down'
                type='FontAwesome'
                color='#f50'
                onPress={() => console.log('hello')} />
            <Icon
                raised
                name='volume-up'
                type='FontAwesome'
                color='#f50'
                onPress={() => console.log('hello')} />
            <Icon
                raised
                name='video-switch'
                type='material-community'
                color='#f50'
                onPress={() => console.log('hello')} />
            <Icon
                raised
                name='phone-hangup'
                type='material-community'
                color='#f50'
                onPress={() => console.log('hello')} />
        </View>

        <TabNavigator>
            <TabNavigator.Item
                selected={this.state.selectedTab === 'home'}
                title="Video"
                renderIcon={() => <Icon
                    name='projection-screen'
                    type='foundation'
                    iconStyle={{opacity: 0.5}}
                    color='#f50'/> }
                renderSelectedIcon={() => <Icon
                    name='projection-screen'
                    type='foundation'
                    color='#f50'/> }
                badgeText="1"
                onPress={() => this.setState({ selectedTab: 'home' })}>
                {null}
            </TabNavigator.Item>
            <TabNavigator.Item
                selected={this.state.selectedTab === 'profile'}
                title="Chat"
                renderIcon={() => <Icon
                    name='chat'
                    type='entypo'
                    iconStyle={{opacity: 0.5}}
                    color='#f50'/> }
                renderSelectedIcon={() => <Icon
                    name='chat'
                    type='entypo'
                    color='#f50'/> }
                renderBadge={() => null}
                onPress={() => this.setState({ selectedTab: 'profile' })}>
                {null}
            </TabNavigator.Item>
        </TabNavigator>


            
      </ScrollView>
    );
  }
};

const styles = StyleSheet.create({
  selfView: {
    width: 200,
    height: 150,
  },
  remoteView: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height/2.35
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  listViewContainer: {
    height: 150,
  },
});

AppRegistry.registerComponent('reactNativeJanusWebrtcGateway', () => reactNativeJanusWebrtcGateway);
