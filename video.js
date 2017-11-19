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
  Image,
  Alert
} from 'react-native';

import PropTypes from 'prop-types';

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

import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import * as appAction from './action';

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


class Video extends Component {

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
        audioMute: false,
        videoMute: false,
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
                          let register = { "request": "join", "room": roomId, "ptype": "publisher", "display": myusername.toString() };
                          sfutest.send({"message": register});
                        },
                        error: (error) => {
                          Alert.alert("  -- Error attaching plugin...", error);
                        },
                        consentDialog: (on) => {
                        },
                        mediaState: (medium, on) => {
                        },
                        webrtcState: (on) => {
                        },
                        onmessage: (msg, jsep) => {
                          // console.log(msg)
                          var event = msg["videoroom"];
                          if(event != undefined && event != null) {
                              if(event === "joined") {
                                  myid = msg["id"];
                                  this.publishOwnFeed(true);
                                  this.setState({visible: false}); 
                                  if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                    var list = msg["publishers"];
                                    for(var f in list) {
                                      var id = list[f]["id"];
                                      var display = list[f]["display"];
                                      this.newRemoteFeed(id, display)
                                    }
                                  }
                              } else if(event === "destroyed") {
                              } else if(event === "event") {
                                if(msg["publishers"] !== undefined && msg["publishers"] !== null) {
                                  var list = msg["publishers"];
                                  for(var f in list) {
                                    let id = list[f]["id"]
                                    let display = list[f]["display"]
                                    this.newRemoteFeed(id, display)
                                  }  
                                } else if(msg["leaving"] !== undefined && msg["leaving"] !== null) {                                        
                                  var leaving = msg["leaving"];
                                  var remoteFeed = null;
                                  let numLeaving = parseInt(msg["leaving"])
                                  if(this.state.remoteList.hasOwnProperty(numLeaving)){
                                    delete this.state.remoteList.numLeaving
                                    this.setState({remoteList: this.state.remoteList})
                                    this.state.remoteListPluginHandle[numLeaving].detach();
                                    delete this.state.remoteListPluginHandle.numLeaving
                                  }
                                } else if(msg["unpublished"] !== undefined && msg["unpublished"] !== null) {
                                  var unpublished = msg["unpublished"];
                                  if(unpublished === 'ok') {
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
                          mystream = null;
                        }
                    });
            },
            error: (error) => {
              Alert.alert("  Janus Error", error);
            },
            destroyed: () => {
              Alert.alert("  Success for End Call ");
              this.setState({ publish: false });
            }
        })
  }

    switchVideoType() {
      sfutest.changeLocalCamera();
    }

    toggleAudioMute = () => {
      this.props.App.test()
      let muted = sfutest.isAudioMuted();
      if(muted){
        sfutest.unmuteAudio();
        this.setState({ audioMute: false });
      }else{
        sfutest.muteAudio();
        this.setState({ audioMute: true });
      }
    }

    toggleVideoMute = () => {
      let muted = sfutest.isVideoMuted();
      if(muted){
        this.setState({ videoMute: false });
        sfutest.unmuteVideo();
      }else{
        this.setState({ videoMute: true });
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
            success: (jsep) => {
              var publish = { "request": "configure", "audio": useAudio, "video": true };
              sfutest.send({"message": publish, "jsep": jsep});
            },
            error: (error) => {
              Alert.alert("WebRTC error:", error);
              if (useAudio) {
                  publishOwnFeed(false);
              } else {
              }
            }
          });
      }else{
        // this.setState({ publish: false });
        // let unpublish = { "request": "unpublish" };
        // sfutest.send({"message": unpublish});
      }
    }

  newRemoteFeed(id, display) {
    let remoteFeed = null;
    janus.attach(
        {
          plugin: "janus.plugin.videoroom",
          success: (pluginHandle) => {
              remoteFeed = pluginHandle;
              let listen = { "request": "join", "room": roomId, "ptype": "listener", "feed": id };
              remoteFeed.send({"message": listen});
          },
          error: (error) => {
              Alert.alert("  -- Error attaching plugin...", error);
          },
          onmessage: (msg, jsep) => {
              let event = msg["videoroom"];
              if(event != undefined && event != null) {
                if(event === "attached") {
                    // Subscriber created and attached
                }
              }
              if(jsep !== undefined && jsep !== null) {
                remoteFeed.createAnswer(
                  {
                    jsep: jsep,
                    media: { audioSend: false, videoSend: false },
                    success: (jsep) => {
                        var body = { "request": "start", "room": roomId };
                        remoteFeed.send({"message": body, "jsep": jsep});
                    },
                    error: (error) => {
                      Alert.alert("WebRTC error:", error)
                    } 
                  });
              }
          },
          webrtcState: (on) => {
          },
          onlocalstream: (stream) => {
          },
          onremotestream: (stream) => {
            this.setState({info: 'One peer join!'});
            const remoteList = this.state.remoteList;
            const remoteListPluginHandle = this.state.remoteListPluginHandle;
            remoteList[id] = stream.toURL();
            remoteListPluginHandle[id] = remoteFeed
            this.setState({ remoteList: remoteList, remoteListPluginHandle: remoteListPluginHandle });
          },
          oncleanup: () => {
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
            { this.state.selfViewSrc && <RTCView key={this.state.selfViewSrcKey} streamURL={this.state.selfViewSrc} style={styles.remoteView}/>}
            {this.state.remoteList && Object.keys(this.state.remoteList).map((key, index) => {
                return <RTCView key={Math.floor(Math.random() * 1000)} streamURL={this.state.remoteList[key]} style={styles.remoteView}/>
            })
            }
        </View>
        <View style={{flex: 1, flexDirection: 'row'}}>
          { this.state.audioMute ? 
            <Icon
              raised
              name='microphone-off'
              type='material-community'
              color='grey'
              onPress={() => this.toggleAudioMute()} /> : 
            <Icon
              raised
              name='microphone'
              type='material-community'
              color='black'
              onPress={() => this.toggleAudioMute()} /> }

          { this.state.videoMute ? 
            <Icon
              raised
              name='video-off'
              type='material-community'
              color='grey'
              onPress={() => this.toggleVideoMute()} /> : 
            <Icon
              raised
              name='video'
              type='material-community'
              color='black'
              onPress={() => this.toggleVideoMute()} /> }

          { this.state.speaker ? 
            <Icon
              raised
              name='volume-up'
              type='FontAwesome'
              color='black'
              onPress={() => this.toggleSpeaker()} /> : 
            <Icon
                raised
                name='volume-down'
                type='FontAwesome'
                color='black'
                onPress={() => this.toggleSpeaker()} /> }

          <Icon
            raised
            name='video-switch'
            type='material-community'
            color='black'
            onPress={() => this.switchVideoType()} />
          <Icon
            raised
            name='phone-hangup'
            type='material-community'
            color='red'
            onPress={() => this.endCall()} />
        </View>
        <View style={{ flex: 1 }}>
          <Spinner visible={this.state.visible} textContent={"Connecting..."} textStyle={{color: '#FFF'}} />
        </View>
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


Video.propTypes = {
  App: PropTypes.object.isRequired,
};

function select(store) {
  return {
    App: store.App,
  };
}

function mapDispatchToProps(dispatch) {
  return {
		App: bindActionCreators(appAction , dispatch)
	};
}

export default connect(select, mapDispatchToProps)(Video);

