import config from "./config/config.js";
/**
 * Extends the contact events.
*/
export default async function (contact) {

    console.debug("CDEBUG >> ContactEvents - New Contact contactId: " + contact.contactId);
    console.debug("CDEBUG >> ContactEvents - New Contact InitialContactId(): " + contact.getInitialContactId());
    // console.log(agentChatSession);
    let iframeUrl = localStorage.getItem(`amazon-connect-${contact.contactId}`);

    if (iframeUrl) {
        document.getElementById('agentassist-iframe').src = iframeUrl;
    }



    const cnn = contact.getConnections().find(cnn => cnn.getType() === connect.ConnectionType.AGENT);

    const agentChatSession = connect.ChatSession.create({
        chatDetails: cnn.getMediaInfo(), // REQUIRED
        options: { // REQUIRED
            region: "us-east-1", // REQUIRED, must match the value provided to `connect.core.initCCP()`
        },
        type: connect.ChatSession.SessionTypes.AGENT, // REQUIRED
        websocketManager: connect.core.getWebSocketManager() // REQUIRED
    });

    await agentChatSession.connect();


    agentChatSession.onMessage(event => {
        const { chatDetails, data } = event;
        console.log(`On Message: ${chatDetails}, ${data}`);

        switch (data.Type) {

            case "MESSAGE":
                if (data.ParticipantRole === "CUSTOMER")
                    sendMessageToAgentAssist(data.InitialContactId, data.Content, data.ParticipantRole);

                postConvlogsToAgentAssist(data.InitialContactId, data.Content, data.ParticipantRole);

                break;
            default:
                break;
        }
    });

    // Route to the respective handler
    contact.onIncoming(handleContactIncoming);
    contact.onAccepted(handleContactAccepted);
    contact.onConnecting(handleContactConnecting);
    contact.onConnected(handleContactConnected);
    contact.onEnded(handleContactEnded);
    contact.onDestroy(handleContactDestroyed);
    contact.onMissed(handleContactMissed);

    function postConvlogsToAgentAssist(contactId, content, userType) {
        try {

            let src = document.getElementById('agentassist-iframe').src;
            const iframeUrl = new URL(src);
            const params = iframeUrl.searchParams

            let type = (userType === "CUSTOMER") ? "user" : "agent";

            let author = {
                name: (type === "user") ? "customer" : "agent",
                id: (type === "user") ? "customerId" : "agentId",
                type: type.toUpperCase()
            };

            let object = {
                author: author,
                botId: params.get('botid'),
                type: type.toUpperCase(),
                conversationId: contactId,
                userId: "customerId",
                message: content,
            }
            let iframe = document.getElementById('agentassist-iframe');
            var vfWindow = iframe.contentWindow;
            if (vfWindow) {
                vfWindow.postMessage(object, iframeUrl.href);//window.location.protocol+'//'+window.location.host);
            }

        } catch (error) {
            console.log("error in post message")
        }
    }

    function sendMessageToAgentAssist(contactId, content, userType) {

        let iframe = document.getElementById('agentassist-iframe');
        if (!iframe) {
            return;
        }
        console.log("Kore Agent Assist iframe", iframe);
        var recordId = contactId;

        console.log("New Message recordId:" + recordId + " content:" + content);
        var message = {};
        message['author'] = {};
        message['author'].Id = '';
        // message['author'].type = (participant==='customer'?'USER':'AGENT');
        if (userType != 'AGENT') {
            message['author'].type = 'USER';
            message['author'].firstName = 'User';
            message['author'].lastName = ' ';
            message['name'] = 'agentAssist.CustomerMessage';

        } else {
            message['author'].type = 'AGENT';
            message['name'] = 'agentAssist.AgentMessage';

        }
        message['conversationid'] = recordId;
        message['value'] = content;
        var vfWindow = iframe.contentWindow;
        if (vfWindow) {
            vfWindow.postMessage(message, "*");//window.location.protocol+'//'+window.location.host);
        }
    }

    function handleContactIncoming(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactIncoming');
    }

    function handleContactAccepted(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactAccepted - Contact accepted by agent');
        // Add your custom code here
    }

    function handleContactConnecting(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactConnecting() - Contact connecting to agent');
        // Add your custom code here
    }

    async function handleContactConnected(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactConnected() - Contact connected to agent');

        console.log("-------------", contact);
        let contactId = contact.contactId;

        let backendUrl = config.BACKEND_URL;

        fetch(backendUrl, {
            method: 'GET',
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log(data); // Process and use the data

                let { botId, token, agentassistUrl } = data;
                let smartassistUrl = agentassistUrl.replace("agentassist", "smartassist");

                let iframeUrl = `${agentassistUrl}/koreagentassist-sdk/UI/agentassist-iframe.html?token=${token}&botid=${botId}&agentassisturl=${smartassistUrl}&conversationid=${contactId}&source=amazonConnect&isCall=false`;
                document.getElementById("agentassist-iframe").src = iframeUrl;
                localStorage.setItem(`amazon-connect-${contactId}`, iframeUrl)
            })
            .catch(error => {
                console.error('There has been a problem with your fetch operation:', error);
            });
    }

    function handleContactEnded(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactEnded() - Contact has ended successfully');
        // Add your custom code here

        let src = document.getElementById('agentassist-iframe').src;
        const iframeUrl = new URL(src);
        const params = iframeUrl.searchParams

        let activeConversationId = contact.contactId;
        var message = {};
        message['payload'] = {};
        message['payload'].chatHistory = [];//incase of call we are sending the empty
        message['conversationId'] = activeConversationId;
        message['name'] = 'agentAssist.endOfConversation';
        message['botId'] = params.get('botid');

        let iframe = document.getElementById('agentassist-iframe');
        var vfWindow = iframe.contentWindow;
        if (vfWindow) {
            vfWindow.postMessage(message, iframeUrl.href);//window.location.protocol+'//'+window.location.host);
        }

        localStorage.removeItem(`amazon-connect-${contact.contactId}`);
    }

    function handleContactDestroyed(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactDestroyed() - Contact will be destroyed');
        // Add your custom code here

        document.getElementById("agentassist-iframe").src = "about:blank";
    }

    function handleContactMissed(contact) {
        console.debug('CDEBUG >> ContactEvents.handleContactMissed() - Contact was missed');
    }

    window.addEventListener("message", async (event) => {
        // console.log("Kore Agent Assist inside window eventlistener", this.activeConversationId, event.data);
        var recordId = contact.contactId;

        if (event.data.name === "agentAssist.SendMessage" && event.data.conversationId == recordId) {
            //console.log(event.data.payload);
            var msg = '';
            try {
                msg = JSON.parse(decodeURI(event.data.payload)).message[0].cInfo.body;
            } catch (e) {
                msg = decodeURI(encodeURI(event.data.payload));
            }
            console.log("kore:: Send buttons", msg);

            const awsSdkResponse = await agentChatSession.sendMessage({
                contentType: "text/plain",
                message: `${msg}`
            });
            const { AbsoluteTime, Id } = awsSdkResponse.data;
            console.log(`Message has been sent: ${AbsoluteTime}, ${Id}`);

        } else if (event.data.name === "agentAssist.CopyMessage" && event.data.conversationId == recordId) {
            var msg = decodeURI(encodeURI(event.data.payload));
            //   Actions.invokeAction("SetInputText", { body: msg, conversationSid: recordId });
            // myClientApp.conversations.proposeInteractionMessage("insert", msg);

            console.log("kore::Copied messages", msg);

        } else if (event.data.method === "agentassist_loaded") {
            let iframe = document.getElementById('agentassist-iframe');
            if (!iframe) {
                console.log("iframe not loaded........");
            }

            let agentCoachingData = {};
            console.log("------meta info------")
            console.log(agentCoachingData);
            console.log("-------------------");

            let coachingDetails = {
                name: "acGroupDetails",
                agentCoachingData
            }


            var agentMessage = {};
            agentMessage['agentDetails'] = {
                agentId: "agentId",
                agentName: "agentName",
                agentInfo: {}
            }
            agentMessage['name'] = 'setAgentInfo';
            var vfWindow = iframe.contentWindow;
            if (vfWindow) {
                vfWindow.postMessage(agentMessage, "*");//window.location.protocol+'//'+window.location.host);
            }

            var userMessage = {};
            userMessage['userDetails'] = {
                userId: "customerId",
                userName: "customerName",
                userInfo: {}
            }
            userMessage['name'] = 'setUserInfo';
            var vfWindow = iframe.contentWindow;


            // console.log("*****************");
            // console.log(agentMessage, userMessage);
            // console.log("*****************");

            if (vfWindow) {
                vfWindow.postMessage(userMessage, "*");//window.location.protocol+'//'+window.location.host);
                vfWindow.postMessage(coachingDetails, "*"); // send Agent and Manager details to AgentAssist
            }

        }
        else if (event.data.name === "agentAssist.conversation_summary" && event.data.conversationId == contactId) {
            
        }
    }, false);
}


