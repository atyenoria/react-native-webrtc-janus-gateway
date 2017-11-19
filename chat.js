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

import { GiftedChat, Bubble } from 'react-native-gifted-chat';


class Chat extends Component {

    constructor(props) {
        super(props);
        this.state ={ 
            info: 'Initializing',
            user: {
              _id: 2
            },
            messages: [
              {
                _id: 1,
                text: 'Hello developer',
                createdAt: new Date(),
                user: {
                  _id: 2,
                  name: 'React Native',
                  avatar: 'https://facebook.github.io/react/img/logo_og.png',
                },
              }, 
              {
                _id: 2,
                text: 'Hello dev',
                createdAt: new Date(),
                user: {
                  _id: 3,
                  name: 'atyenoria',
                  avatar: 'https://facebook.github.io/react/img/logo_og.png',
                },
              },
            ],
        };
    }

    onSend(messages = []) {
      this.setState((previousState) => ({
        messages: GiftedChat.append(previousState.messages, messages),
      }));
    } 

    componentDidMount(){
    }


    renderName = (props) => {
      const { user: self } = this.state
      const { user = {} } = props.currentMessage
      const { user: pUser = {} } = props.previousMessage
      const isSameUser = pUser._id === user._id
      const isSelf = user._id === self._id
      const shouldNotRenderName = isSameUser
    
      return shouldNotRenderName ? (
        <View />
      ) : (
        <Text
          style={[ isSelf ? styles.selfUser : styles.otherUser ]}>
          {user.name}
        </Text>
      )
    }


    renderBubble = (props) => {
      return (
          <View>
            {this.renderName(props)}
            <Bubble {...props} />
          </View>
        )
    }
    

    render() {
        return(
            <GiftedChat
              messages={this.state.messages}
              renderBubble={this.renderBubble}
              onSend={(messages) => this.onSend(messages)}
              user={{
                _id: 1,
              }}
            />
        )
    }
}

const styles = StyleSheet.create({
  selfView: {
    width: 200,
    height: 150,
  }
});

export default Chat
