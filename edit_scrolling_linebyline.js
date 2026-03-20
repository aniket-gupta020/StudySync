const fs = require('fs');
const file = 'c:\\xampp\\htdocs\\Projectss\\StudySync\\client\\src\\components\\chat\\MessageList.jsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = '}, [messages]);';
const replaceWith = \`    }, [messages]);

    // Scroll to bottom when typing indicators appear
    useEffect(() => {
        if (typingUsers && typingUsers.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [typingUsers.length]);\`;

const biggerAnchorWin = 'prevMessagesRef.current = messages;\\r\\n    }, [messages]);';
const biggerAnchorUnix = 'prevMessagesRef.current = messages;\\n    }, [messages]);';

if (content.includes(biggerAnchorWin)) {
    content = content.replace(biggerAnchorWin, 'prevMessagesRef.current = messages;\\r\\n' + replaceWith);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Typing Scroll fixed successfully (Windows CR/LF)!');
} else if (content.includes(biggerAnchorUnix)) {
    content = content.replace(biggerAnchorUnix, 'prevMessagesRef.current = messages;\\n' + replaceWith);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Typing Scroll fixed successfully (Unix LF)!');
} else {
    console.log('Bigger anchor matching failed! Trying simpler fallback.');
    if (content.includes('prevMessagesRef.current = messages;') && content.includes('}, [messages]);')) {
         console.log('Found core components but direct string matching failed due to spacing/tabs. Trying Regex.');
         const target = content.match(/prevMessagesRef\.current\s*=\s*messages;[\s]*\},\s*\[messages\]\s*\);/i);
         if (target) {
              const insideStr = target[0].replace(');', ');\\n\\n    // Scroll to bottom when typing indicators appear\\n    useEffect(() => {\\n        if (typingUsers && typingUsers.length > 0) {\\n            bottomRef.current?.scrollIntoView({ behavior: "smooth" });\\n        }\\n    }, [typingUsers.length]);');
              content = content.replace(target[0], insideStr);
              fs.writeFileSync(file, content, 'utf8');
              console.log('Regex fallback succeeded!');
         } else {
              console.log('Regex fallback failed too!');
         }
    } else {
         console.log('Core anchors not found in file!');
    }
}
