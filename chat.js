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

import { GiftedChat } from 'react-native-gifted-chat';


class Chat extends Component {

    constructor(props) {
        super(props);
        this.state ={ 
            info: 'Initializing',
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

    render() {
        return(
            <GiftedChat
              messages={this.state.messages}
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
