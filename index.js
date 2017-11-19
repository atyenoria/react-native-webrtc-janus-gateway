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
import Video from './video';
import Chat from './chat';


class reactNativeJanusWebrtcGateway extends Component{

    constructor(props) {
        super(props);
        this.state = {
			selectedTab: 'chat',
		}
    }

    onSelectTab(tab) {
        this.setState({ selectedTab: tab });
    }

    render() {
        return (
        <View style={styles.container} >
            <TabNavigator>
                <TabNavigator.Item
                    selected={this.state.selectedTab === 'video'}
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
                    onPress={() => this.setState({ selectedTab: 'video' })} >
                    <Video />
                </TabNavigator.Item>
                <TabNavigator.Item
                    selected={this.state.selectedTab === 'chat'}
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
                    onPress={() => this.setState({ selectedTab: 'chat' })}>
                    <Chat />
                </TabNavigator.Item>
            </TabNavigator>
            </View>
        );
    }
};

let styles = StyleSheet.create({
	container: {
		flex: 1
	}
});

AppRegistry.registerComponent('reactNativeJanusWebrtcGateway', () => reactNativeJanusWebrtcGateway);
