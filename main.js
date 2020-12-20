// custom code
function cuscode() {
	var value = document.getElementById("custom-id").value;
	if (document.getElementById("custom-id").value === "") {
	  alert("Code cannot be empty.");
	} else if (value.length <= 5) {
	  alert("Code needs to be 6 letters or longer.");
	} else {
	  document.title = "creating..."; window.open("https://chatclient.spinfal.repl.co/?chat=" +  document.getElementById("custom-id").value, "_self");
	}
}
// kinda ghetto but eh :shrug:
// server status link
function servStat() {
  window.open('https://waa.ai/serverStatus');
}
var msgBar = document.getElementById('message');
// max input notice
function checkAmount() {
  if(msgBar.value.length == 2000) {
    alert("You have reached the maximum character limit (2000)");
  } else if (msgBar.value.length != 2000) {
    return false;    
  }
}
// focus on page hide/show
document.addEventListener("visibilitychange", onchange => {
  msgBar.focus();
});
function startFocus() {
  msgBar.focus();
}
function report() {
  if (window.confirm('before reporting an issue, make sure you have attempted to join a chat multiple times, at least'))
{
  window.open("https://waa.ai/report", "_blank");
  }
}

// main js
const consonants = 'bdfghjklmnprstvwz';
const vowels = 'aeiou';
function randomWord(syllables = 3, nasalChances = 0.3) {
  let word = '';
  for (let i = 0; i < syllables; i++) {
    const consonant = consonants[Math.random() * consonants.length >> 0];
    if (consonant !== word[word.length - 1])
      word += consonant; // no double n
    word += vowels[Math.random() * vowels.length >> 0];
    if (Math.random() < nasalChances) word += 'n';
  }
  return word;
}

const SPIN_PREFIX = 'spin-';
function createChat(on = {}, id = randomWord(), messages = [], userData = {}) {
  return new Promise((res, rej) => {
    const peer = new Peer(SPIN_PREFIX + id);
    const members = []; // list of connections
    if (!userData[peer.id]) userData[peer.id] = {colour: '#ffffff', name: randomWord()};
    function broadcast(msg) {
      members.forEach(conn => conn.send(msg));
    }
    function announce(msg, time = Date.now()) {
      const msgObj = {type: 'announcement', content: encodeURIComponent(msg), time};
      messages.push(msgObj);
      broadcast({type: 'new-message', message: msgObj});
      if (on.message) on.message(msgObj);
    }
    function receive(peerID, data) {
      switch (data.type) {
        case 'new-message': {
          const msgObj = {type: 'message', content: data.content, author: peerID, time: data.time, data: data.data};
          messages.push(msgObj);
          broadcast({type: 'new-message', message: msgObj});
          if (on.message) on.message(msgObj);
          startFocus(); // only works for host it seems
          break;
        }
        case 'set-colour': {
          userData[peerID].colour = data.colour;
          broadcast({type: 'set-user-data', user: peerID, colour: data.colour});
          if (on.coloursUpdate) on.coloursUpdate(peerID);
          break;
        }
        case 'set-name': {
          const oldName = userData[peerID].name;
          userData[peerID].name = data.name;
          broadcast({type: 'set-user-data', user: peerID, name: data.name});
          announce(`${oldName} set their name to ${data.name} (id: ${peerID}).`);
          break;
        }
      }
    }
    function welcomeNewMember(conn) {
      members.push(conn);
      let unwelcomed = true;
      conn.on('open', () => {
        conn.send({type: 'welcome', messages, userData});
      });
      conn.on('data', data => {
        if (data.type === 'welcomed' && unwelcomed) {
          if (!userData[conn.peer]) {
            const name = randomWord();
            userData[conn.peer] = {colour: '#ffffff', name};
            broadcast({type: 'set-user-data', user: conn.peer, colour: '#ffffff', name});
            if (on.coloursUpdate) on.coloursUpdate(conn.peer);
          }
          announce(`${userData[conn.peer].name} joined (id: ${conn.peer}).`);
          unwelcomed = false;
        } else receive(conn.peer, data);
      });
      conn.on('close', () => {
        const index = members.indexOf(conn);
        if (~index) members.splice(index, 1);
        announce(`${userData[conn.peer].name} left (id: ${conn.peer}).`);
        delete userData[conn.peer];
        broadcast({type: 'user-left', user: conn.peer});
        peer.destroy();
      });
    }
    peer.on('open', () => {
      Object.keys(userData).forEach(peerID => {
        if (peerID === peer.id) return;
        const conn = peer.connect(peerID, {
      host: 'pjsserver.spinfal.repl.co',
      pingInterval: 5000,
      debug: 2
    });
        welcomeNewMember(conn);
      });
      peer.on('connection', welcomeNewMember);
      res({
        send(msg, metadata) {
          receive(peer.id, {type: 'new-message', content: encodeURIComponent(msg), time: Date.now(), data: metadata});
        },
        setColour(colour) {
          receive(peer.id, {type: 'set-colour', colour});
        },
        setName(name) {
          receive(peer.id, {type: 'set-name', name, time: Date.now()});
        },
        id,
        myID: peer.id
      });
      if (on.initialize) on.initialize(messages, userData);
      announce(`the chatroom ID is ${id}; share this with other people so they can join!`);
    });
    peer.on('error', rej);
  });
}
function joinChat(id, on = {}) {
  return new Promise((res, rej) => {
    const peer = new Peer({
      host: 'pjsserver.spinfal.repl.co',
      pingInterval: 5000,
      debug: 2
    });
    const obj = {id};
    let wasClosed = false, open = false;
    function treatConnection(conn) {
      if (open) return;
      open = true;
      let messages, userData;
      conn.on('data', data => {
        switch (data.type) {
          case 'welcome': {
            messages = data.messages;
            userData = data.userData;
            if (on.initialize) on.initialize(messages, userData);
            conn.send({type: 'welcomed'});
            break;
          }
          case 'new-message': {
            messages.push(data.message);
            if (on.message) on.message(data.message);
            startFocus();
            break;
          }
          case 'set-user-data': {
            if (!userData[data.user]) userData[data.user] = {};
            if (data.colour) {
              userData[data.user].colour = data.colour;
              if (on.coloursUpdate) on.coloursUpdate(data.user);
            }
            if (data.name) {
              userData[data.user].name = data.name;
            }
            break;
          }
          case 'user-left': {
            delete userData[data.user];
            peer.destroy();
            break;
          }
        }
      });
      obj.send = (msg, metadata) => conn.send({type: 'new-message', content: encodeURIComponent(msg), time: Date.now(), data: metadata});
      obj.setColour = colour => conn.send({type: 'set-colour', colour});
      obj.setName = name => conn.send({type: 'set-name', name, time: Date.now()});
      obj.destroy = () => peer.destroy();
      obj.myID = peer.id;
      conn.on('close', () => {
        delete userData[conn.peer];
        if (on.close) on.close();
        wasClosed = true;
        open = false;
      });
      if (wasClosed && on.reopen) on.reopen();
    }
    peer.on('open', () => {
      const conn = peer.connect(SPIN_PREFIX + id, {
      host: 'pjsserver.spinfal.repl.co',
      pingInterval: 5000,
      debug: 2
    });
      treatConnection(conn);
      conn.on('open', () => {
        res(obj);
      });
      peer.on('connection', treatConnection);
      conn.on('error', rej);
    });
    peer.on('error', rej);
  });
}

const chat = document.getElementById('chat');
const messageInput = document.getElementById('message');
const chatPage = document.getElementById('chat');
let onsubmit = null;
messageInput.addEventListener('keydown', e => {
  const trueValue = messageInput.value.trim();
  if (e.keyCode === 13 && trueValue && onsubmit) {
    onsubmit(trueValue);
    messageInput.value = '';
  }
});
chat.addEventListener('wheel', e => {
  messageInput.blur();
});
chat.addEventListener('touchstart', e => {
  messageInput.blur();
});
messageInput.addEventListener('blur', e => {
  if (document.body.classList.contains('scroll-mode')) return;
  messageInput.blur();
  document.body.classList.add('scroll-mode');
  chat.scrollTo(0, chat.scrollHeight);
});
messageInput.addEventListener('focus', e => {
  document.body.classList.remove('scroll-mode');
});
const illegalNameCharsRegex = /[^a-z ]/i;
// https://www.materialui.co/flatuicolors
const nameColours = {
  teal: '#1abc9c', green: '#2ecc71', blue: '#3498db', purple: '#9b59b6',
  yellow: '#f1c40f', orange: '#e67e22', red: '#e74c3c', white: '#ecf0f1',
  grey: '#95a5a6', gray: '#95a5a6', black: '#34495e', pink: '#ff008f'
	};
async function launchChat(chatGetter) {
  document.body.classList.add('chat-mode');
  let messages, userData;
  function createMessage({type, content, author, time, data}) {
    if (!data) data = {};
    const message = document.createElement('div');
    message.classList.add('message');
    if (type === 'message') {
      message.classList.add('normal');
      const authorSpan = document.createElement('span');
      authorSpan.classList.add('author');
      authorSpan.textContent = userData[author] ? userData[author].name : '[deleted user]';
      if (userData[author]) authorSpan.style.color = userData[author].colour;
      message.appendChild(authorSpan);
      message.appendChild(document.createTextNode('  '));
    } else if (type === 'announcement') {
      message.classList.add('announcement');
    } else if (type === 'self-message') {
      message.classList.add('self-message');
    }
    const contentSpan = document.createElement('span');
    contentSpan.classList.add('content');
    contentSpan.textContent = decodeURIComponent(content);
    const timeDiv = document.createElement('div');
    const timeSet = document.createElement('p');
    timeSet.classList.add('timeData');
    timeDiv.classList.add('timeDiv');
    //timeSet.classList.add('content');
    const timeData = document.createTextNode(new Date().toLocaleTimeString());
    if (data.italics) {
			contentSpan.classList.add('italics');
		} else if (data.bold) {
			contentSpan.classList.add('bold');
		} else if (data.strike) {
			contentSpan.classList.add('strike');
		} else if (data.under) {
			contentSpan.classList.add('under');
		}
    message.appendChild(contentSpan);
    timeSet.appendChild(timeDiv);
    timeSet.appendChild(timeData);
    message.appendChild(timeSet);
    return message;
    startFocus();
  }
  function submitHandler(msg) {
    if (msg[0] === '/') {
      if (msg[1] === '/') obj.send(msg.slice(1));
      else {
        const command = msg.slice(1).split(' ')[0];
        switch (command) {
          case 'help': {
            selfPost('/help - List of commands\n'
              + '//[rest of message] - Sends the message beginning with a single slash (escapes the command)\n'
              + '/setname [name] - Sets your display name (alias: /nick)\n'
              + '/setcolour [colour name] - Sets your display name colour (aliases: /setcolor, /colour, /color)\n'
              + '/me [message] - Italicizes your message\n'
              + '/bold [message] - Makes your message bold\n'
              + '/strike [message] - Strikethrough your message\n'
              + '/under [message] - Underlines your message\n'
              + '/rejoin - Rejoins the current chat\n'
              + '/new [room name] - Makes a new chat room for you (alias: /newroom)\n'
              + '/tableflip - Sends the tableflip unicode emote\n'
              + '/unflip - Sends the un-tableflip unicode emote\n'
              + '/shrug - Sends the shrug unicode emote');
            break;
          }
          case 'setname': case 'nick': {
            const name = msg.slice(1 + command.length + 1);
            if (!name) selfPost('Display names must be between 3-20 characters long and may only contain letters and spaces.');
            else if (name.length < 3) selfPost('Display name too short (min 3 chars).');
            else if (name.length > 20) selfPost('Display name too long (max 20 chars).');
            else if (name.includes('  ')) selfPost('Display name contains more than one space in a row.');
            else if (illegalNameCharsRegex.test(name)) selfPost('Display name contains undesirable characters.');
            else obj.setName(name);
            break;
          }
          case 'setcolour': case 'setcolor': case 'colour': case 'color': {
            const colour = msg.slice(1 + command.length + 1);
            if (nameColours[colour]) {
              obj.setColour(nameColours[colour]);
              selfPost('name colour set to ' + colour);
            }
            else selfPost('Colours: ' + Object.keys(nameColours).join(', '));
            break;
          }
          case 'rejoin': {
		  			selfPost('rejoining...');
		  			document.title = "rejoining chat...";
            window.location.reload();
            break;
		  		}
          case 'new': case 'newroom': {
		  			roomName = msg.slice(1 + command.length + 1);
		  			if (roomName.length <= 5) {
		  				selfPost('room names must be 6 letters or more.');
		  			} else {
		  				selfPost('making new room...');
		  			  document.title = "joining new room...";
              window.open("?chat=" + roomName, "_self");
              break;
		  			}
		  			break;
          }
          case 'tableflip': {
            obj.send("(╯°□°)╯︵ ┻━┻");
            break;
          }
          case'unflip': {
            obj.send("┬─┬ノ( º _ ºノ)")
            break;
          }
          case 'shrug': {
            obj.send("¯\\_(ツ)_/¯");
            break;
          }
          case 'me': {
            const message = msg.slice(1 + command.length + 1);
            if (message) {
              obj.send(message, {italics: true});
            }
            break;
          }
          case 'bold': {
            const message = msg.slice(1 + command.length + 1);
            if (message) {
              obj.send(message, {bold: true});
            }
            break;
          }
          case 'strike': {
            const message = msg.slice(1 + command.length + 1);
            if (message) {
              obj.send(message, {strike: true});
            }
            break;
          }
          case 'under': {
            const message = msg.slice(1 + command.length + 1);
            if (message) {
              obj.send(message, {under: true});
            }
            break;
          }
          default:
            selfPost('unknown command. (use a double slash to escape a command)');
        }
      }
    } else {
      obj.send(msg);
      startFocus();
    }
  }
  const obj = await chatGetter({
    initialize(msgs, ud) {
      chat.innerHTML = '';
      messages = msgs;
      userData = ud;
      const fragment = document.createDocumentFragment();
      messages.forEach(msg => fragment.appendChild(createMessage(msg)));
      chat.appendChild(fragment);
      selfPost('hello! type /help for a list of commands.');
    },
    message(msg) {
      chat.appendChild(createMessage(msg));
    },
    close() {
      onsubmit = null;
      messageInput.disabled = true;
      chat.appendChild(hostClosedMessage);
    },
    reopen() {
      onsubmit = submitHandler;
      messageInput.disabled = false;
      chat.removeChild(hostClosedMessage);
    }
  });
  const hostClosedMessage = document.createElement('div');
  hostClosedMessage.classList.add('message');
  const hostClosedContent = document.createElement('span');
  hostClosedContent.classList.add('content');
  hostClosedContent.textContent = 'seems the host of the chat has gone offline. take over?';
  hostClosedMessage.appendChild(hostClosedContent);
  const hostClosedBtn = document.createElement('button');
  hostClosedBtn.classList.add('chat-btn');
  hostClosedBtn.textContent = 'sure';
  hostClosedBtn.addEventListener('click', e => {
    const messagesClone = JSON.parse(JSON.stringify(messages));
    const userDataClone = JSON.parse(JSON.stringify(userData));
    messagesClone.push({
      type: 'announcement',
      content: encodeURIComponent(`host transferred to ${userData[obj.myID].name}.`),
      time: Date.now()
    });
    const newID = SPIN_PREFIX + obj.id;
    userDataClone[newID] = userDataClone[obj.myID];
    delete userDataClone[obj.myID];
    messagesClone.forEach(msg => {
      if (msg.author === obj.myID) msg.author = newID;
      else if (msg.author === newID) msg.author = 'was-' + newID;
    });
    launchChat(listeners => createChat(listeners, obj.id, messagesClone, userDataClone))
      .catch(err => {
        console.log(err);
        selfPost('there was a problem taking over.');
      });
    obj.destroy();
  });
  hostClosedMessage.appendChild(hostClosedBtn);
  window.history.pushState({}, '', '?chat=' + obj.id);
  onsubmit = submitHandler;
  messageInput.disabled = false;
  messageInput.focus();
  function selfPost(msg) {
    chat.appendChild(createMessage({type: 'self-message', content: encodeURIComponent(msg), time: Date.now()}));
  }
}
document.getElementById('create').addEventListener('click', e => {
  launchChat(listeners => createChat(listeners))
    .catch(err => {
      document.body.classList.remove('chat-mode');
      window.history.pushState({}, '', window.location.pathname);
      console.log(err);
    });
});
const joinID = document.getElementById('join-id');
const idError = document.getElementById('id-error');
const idRegex = /[a-z]{6,9}/;
document.getElementById('join').addEventListener('click', e => {
  const id = joinID.value.toLowerCase();
  if (idRegex.test(id))
    launchChat(listeners => joinChat(id, listeners))
      .catch(err => {
        idError.textContent = 'problem connecting to room.';
        idError.classList.remove('hidden');
        document.body.classList.remove('chat-mode');
        window.history.pushState({}, '', window.location.pathname);
        console.log(err);
      });
  else {
    idError.textContent = 'that doesn\'t look like a chat ID.';
    idError.classList.remove('hidden');
  }
});
const params = new URL(window.location).searchParams;
if (params.get('chat')) {
  const id = params.get('chat');
  if (idRegex.test(id)) {
    launchChat(listeners => joinChat(id, listeners))
      .catch(() => launchChat(listeners => createChat(listeners, id)))
        .catch(err => {
          document.body.classList.remove('chat-mode');
          window.history.pushState({}, '', window.location.pathname);
          console.log(err);
        });
  }
}

// reload or leave warning
window.onbeforeunload = function() {
   return "reloading or leaving this page may clear or disconnect your current chat"
   //return;
};
