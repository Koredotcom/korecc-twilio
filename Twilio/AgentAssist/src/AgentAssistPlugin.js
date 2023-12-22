import React from 'react';

import { VERSION } from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';
import axios from 'axios';


import CustomTaskListContainer from './components/CustomTask/CustomTask';
import reducers, { namespace } from './states';
//import CustomCRM from './components/CustomCRM';
import { Actions } from "@twilio/flex-ui";

const PLUGIN_NAME = 'AgentAssistPlugin';

export default class AgentAssistPlugin extends FlexPlugin {
  eventListenerAdded = false;
  _handleMessageAddedListener = null;
  isCallConversation = false;
  activeConversationId = '';
  _conversations = {};
  customerName = '';
  customerId = '';
  agentName = '';
  agentId = '';

  activeConversations = {};

    // Any additional setup you need when the component mounts
  constructor() {
    super(PLUGIN_NAME);

  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { import('@twilio/flex-ui').Manager }
   */

  async init(flex, manager) {
    // console.log("============================ flex MSG input >>",flex.DynamicComponent);
    this.createWindowListener(manager);
    this.registerReducers(manager);

    // flex.AgentDesktopView.Panel2.Content.remove('container');
    // // flex.AgentDesktopView.defaultProps.showPanel2=false;
    // flex.AgentDesktopView.Panel2.Content.replace(

    // )
    // flex.AgentDesktopView.Panel1.Content.add(<CustomTaskListContainer key="AgentAssistPlugin-component" />, options);
    // flex.AgentDesktopView.Panel2.Content.remove('container');
    flex.AgentDesktopView.Panel2.Content.replace(<CustomTaskListContainer key="AgentAssistPlugin-component" />)

    manager.strings.NoTasks = "Welcome to Twilio flex, This page is for Kore.AI";
    this.agentName = manager.store.getState().flex.worker.attributes.contact_uri.split(":")[1];
    this.agentId = manager.store.getState().flex.worker.activity.accountSid;

    const currentFlexConfig = Twilio.Flex.Manager.getInstance().serviceConfiguration.attributes;


    console.log(currentFlexConfig);
    let serverlessURL = currentFlexConfig?.kore_agent_assist?.runtime_service;

    // let showPanel2 =  currentFlexConfig?.AgentDesktopView?.showPanel2 || false;
    // flex.AgentDesktopView.defaultProps.showPanel2=showPanel2;
    // manager.store.getState().flex.session
    console.log("********* serverless URL *********");

    console.log(serverlessURL);
    console.log("**********************************");
    const body = {
      Token: manager.store.getState().flex.session.ssoTokenPayload.token,
      identity: "number"
    };

    // getting generated token from twilio function
    // serverlessURL = "https://8fb6-115-114-88-222.ngrok.io/sendMessage"
    var funcResponse = await axios.post(serverlessURL, body);
    let { agentassistURL, token, smartassistURL, botId, isCall, autoBotId, agentGroup } = funcResponse.data;
    console.log("Kore Agent Assist state", manager.store.getState())

    const conversationsClient = manager.conversationsClient;

    conversationsClient.on('conversationUpdated', (conversationUpdate) => {
      const { conversation } = conversationUpdate;
      console.log("---------------");
      console.log(JSON.stringify(conversation));
      console.log("---------------");
      if (conversation.state.current === 'closed') {
        var message = {};
        message['payload'] = {};
        message['payload'].chatHistory = [];//incase of call we are sending the empty
        message['conversationId'] = conversation.sid;
        message['name'] = 'agentAssist.endOfConversation';
        message['botId'] = botId;

        let iframe = document.getElementById('agentassist-iframe');
        var vfWindow = iframe.contentWindow;
        if (vfWindow) {
          vfWindow.postMessage(message, agentassistURL);//window.location.protocol+'//'+window.location.host);
        }
      }

    });

    // Listen for new chat messages
    conversationsClient.on('messageAdded', (message) => {

      // const conversationSid = message.source.sid;
      const conversationSid = message.conversation.sid;
      // Handle the chat message as needed
      // You can access message attributes like message.body, message.author, etc.
      if (message.author === this.agentName) {
        //Agent 
        this.postMessageToConvLog(botId, conversationSid, "agent", message.body, agentassistURL);
      } else {
        this.sendMessageToAgentAssist(conversationSid, message.body, agentassistURL);
        this.postMessageToConvLog(botId, conversationSid, "user", message.body, agentassistURL);
      }
    });

    flex.Actions.addListener('afterAcceptTask', async (payload) => {

      if (payload.task && payload.task.attributes) {

        // Extract necessary details from the task
        const conversationSid = payload.task.attributes.conversationSid || payload.task.attributes.call_sid;
        const customerName = payload.task.attributes.from;
        const customerId = payload.task.attributes.customerName;
        const isCallConversation = payload.task.channelType === "voice";

        this.renderIframeForTask(agentassistURL, smartassistURL, token, botId, conversationSid,isCallConversation, manager);

      }
      // no account number found
      else {
        console.log("Error in Payload")
      }

    });

    flex.Actions.addListener('afterSelectTask', (payload) => {

      if (payload.task && payload.task.attributes) {

        // Extract necessary details from the task
        const conversationSid = payload.task.attributes.conversationSid || payload.task.attributes.call_sid;
        const customerName = payload.task.attributes.from;
        const customerId = payload.task.attributes.customerName;
        const isCallConversation = payload.task.channelType === "voice";
        this.renderIframeForTask(agentassistURL, smartassistURL, token, botId, conversationSid,isCallConversation, manager);

      }

    });

    flex.Actions.addListener('afterCompleteTask', async (payload) => {
      console.log("completing the task", payload);
      // Remove from activeConversations and localStorag

      manager.store.dispatch({ type: "IFRAME_URL", iframeUrl: `about:blank` });

    });

    console.log("----------------func----------------------------");
    console.log(funcResponse.data);
    console.log("----------------change----------------------------");
    // flex.AgentDesktopView.defaultProps.showPanel2  = false;

    // When new task is accepted
    // changeURL(iframeURL);




    const options = { sortOrder: -1 };


  }

  renderIframeForTask(agentassistURL, smartassistURL, token, botId, conversationSid,isCallConversation, manager){
    
            // Define custom data and source as per your requirement
        let customdata = encodeURI(JSON.stringify({ fName: 'Customer', lName: '' })); // voice call 
        let _source = "twilio";

        // Construct the iframe URL
        let iframeURL = `${agentassistURL}/koreagentassist-sdk/UI/agentassist-iframe.html?token=${token}&botid=${botId}&agentassisturl=${smartassistURL}&conversationid=${conversationSid}&source=${_source}&isCall=${isCallConversation}&customdata=${customdata}`;

        // Dispatch action to set the iframe URL
        manager.store.dispatch({ type: "IFRAME_URL", iframeUrl: iframeURL });
    
  }

  createWindowListener(manager) {
    // var flex = manager.store.getState().flex;
    window.addEventListener("message", async (event) => {
      console.log("**** Kore Agent Assist inside window eventlistener", event.data.conversationId, event.data);
      const recordId = event.data.conversationId;
        if (event.data.name === "agentAssist.SendMessage") {
          //console.log(event.data.payload);
          var msg = '';
          try {
            msg = JSON.parse(decodeURI(event.data.payload)).message[0].cInfo.body;
          } catch (e) {
            msg = decodeURI(encodeURI(event.data.payload));
          }
          console.log("Kore Agent Assist1 sending message", msg);

          Actions.invokeAction("SendMessage", { body: msg, conversationSid: recordId });

        } else if (event.data.name === "agentAssist.CopyMessage") {
          var msg = decodeURI(encodeURI(event.data.payload));
          console.log("Kore Agent Assist1 copying message", msg);

          Actions.invokeAction("SetInputText", { body: msg, conversationSid: recordId });
        } else if (event.data.method === "agentassist_loaded") {
          let iframe = document.getElementById('agentassist-iframe');
          if (!iframe) {
            console.log("iframe not loaded........");
          }
          var agentMessage = {};
          agentMessage['agentDetails'] = {
            agentId: this.agentId,
            agentName: this.agentName,
            agentInfo: {}
          }
          agentMessage['name'] = 'setAgentInfo';
          var vfWindow = iframe.contentWindow;
          if (vfWindow) {
            vfWindow.postMessage(agentMessage, "*");//window.location.protocol+'//'+window.location.host);
          }

          var userMessage = {};
          userMessage['userDetails'] = {
            userId: this.customerId,
            userName: this.customerName,
            userInfo: {}
          }
          userMessage['name'] = 'setUserInfo';
          var vfWindow = iframe.contentWindow;


          // console.log("*****************");
          // console.log(agentMessage, userMessage);
          // console.log("*****************");

          if (vfWindow) {
            vfWindow.postMessage(userMessage, "*");//window.location.protocol+'//'+window.location.host);
          }

        }

    }, false);

  }

  postMessageToConvLog(botId, conversationid, authorType, message, agentassistURL) {
    try {

      // let type = (author === "customer")?"user":"agent";
      console.log("Message Author TYpe: ", authorType)

      let _author = {
        name: (authorType === "user") ? "Customer" : "Agent",
        id: (authorType === "user") ? "customerId" : "agentId",
        type: authorType.toUpperCase()
      };

      let object = {
        author: _author,
        botId: botId,
        type: authorType.toUpperCase(),
        conversationId: conversationid,
        message: message,
        customData:{
          "name":"First Name",
          "email": "someone@email.com",
          "permissions":["admin", "superAdmin", "developer", "agent"]
        }
      }
      let iframe = document.getElementById('agentassist-iframe');
      var vfWindow = iframe.contentWindow;
      if (vfWindow) {
        vfWindow.postMessage(object, agentassistURL);//window.location.protocol+'//'+window.location.host);
      }

    } catch (error) {
      console.log("error in post message")
    }

  }
  sendMessageToAgentAssist(conversationId, message, agentAssistURL) {

    let iframe = document.getElementById('agentassist-iframe');
    if (!iframe) {
      return;
    }
    console.log("Kore Agent Assist iframe", iframe);
    var recordId = conversationId;
    var content = message;
    console.log("New Message recordId:" + recordId + " content:" + content);
    var message = {};
    message['author'] = {};
    message['author'].Id = '';
    message['author'].type = 'USER';
    message['conversationid'] = recordId;
    message['name'] = 'agentAssist.CustomerMessage';
    message['value'] = content;
    var vfWindow = iframe.contentWindow;
    if (vfWindow) {
      vfWindow.postMessage(message, agentAssistURL);//window.location.protocol+'//'+window.location.host);
    }
  }

  /**
   * Registers the plugin reducers
   *
   * @param manager { Flex.Manager }
   */
  registerReducers(manager) {
    if (!manager.store.addReducer) {
      // eslint-disable-next-line
      console.error(`You need FlexUI > 1.9.0 to use built-in redux; you are currently on ${VERSION}`);
      return;
    }

    manager.store.addReducer(namespace, reducers);
  }
}
