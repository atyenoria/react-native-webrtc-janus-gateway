# Demo
![demo](https://github.com/atyenoria/react-native-webrtc-video-chat/blob/master/demo.png "demo")

# How it wokrs?
![work](https://github.com/atyenoria/react-native-webrtc-video-chat/blob/master/work.png "work")

# Application

# Dependent Libaries 
- "react-native": "^0.50.3",
- "react-native-webrtc": "^1.58.3"
- "react-native-incall-manager": "^2.2.0"
- "react-native-vector-icons": "^4.4.2"
- "react-native-elements": "^0.18.2"
- "react-native-tab-navigator": "^0.3.4"
- "react-native-gifted-chat": "^0.3.0"

# Functionality
- Janus WebRTC Gateway Video Room Implementation
- Mobile users can send teh audio and video msg to other paritciapnts up to 6 max (can configure in janus)
- Friendly text chat



# TODO
- [x] iOS works
- [ ] Android works
- [x] Janus Plugin Demo: Video Room works ( https://janus.conf.meetecho.com/videoroomtest.html )
- [x] Local camera view
- [x] Remote view
- [x] Audio mute
- [x] Video mute
- [x] Audio Speaker 
- [x] Unpublish and publish 
- [x] Switch front and back camera with react-native-webrtc MediaStreamTrack.prototype._switchCamera()
- [x] End call
- [x] Problem: the delay of receving remote viedeos increases when recreating the webrtc session by unpublish/publish. Soulution: use janus.destroy() for republishing instead of unpublish and publish 
- [x] Rerender teh remote video view if others join and leave continuously
- [x] Rerender my video view when publishing and unpublishing
- [x] Switching camera works after recreating the session
- [x] Connecting modal when creating session
- [x] Redux integration
- [ ] Better handling the janus session by simple redux 
- [ ] Better restarting the the janus session by simple queue system
- [x] Text Chat Mock
- [ ] Rich UI
- [ ] Refactor index.js and janus.mobile.js
- [ ] More Details about how to use this Documentation
- [ ] PR to awesome-react-native ( https://github.com/jondot/awesome-react-native )
- [ ] Other Janus Plugin(Audio bridge, Streaming, Sip, Video Call ... etc)


# Setup for iOS and Android
- Set up the janus with wss configured following by https://github.com/atyenoria/janus-webrtc-gateway-docker
- Change config.example.js to config.js and edit the content as you configured about Janus 


# Setup for iOS
- Code Signing for building on real device
- Change the node path for you env, Build Phases -> Bundle React Native code and images ("export NODE_BINARY=/Users/jima/.nodebrew/current/bin/node")
- Build the iOS project in release or debug

# Setup for Android


# License
- MIT

# Contributor
- @atyenoria


# Any request and bug repoting?
- Could you create a new issue?
