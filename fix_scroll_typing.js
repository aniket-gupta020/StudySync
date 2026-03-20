const fs = require('fs');
const file = 'c:\\xampp\\htdocs\\Projectss\\StudySync\\client\\src\\components\\chat\\MessageList.jsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = 'prevMessagesRef.current = messages;\\r\\n    }, [messages]);';
const anchorUnix = 'prevMessagesRef.current = messages;\\n    }, [messages]);';

const replaceWith = \`prevMessagesRef.current = messages;
    }, [messages]);

    // Scroll to bottom when typing indicators appear
    useEffect(() => {
        if (typingUsers && typingUsers.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [typingUsers.length]);\`;

if (content.includes('prevMessagesRef.current = messages;') && content.includes('}, [messages]);')) {
    // Better match: find the block end
    const target = content.match(/prevMessagesRef\.current\s*=\s*messages;[\s]*\},\s*\[messages\]\s*\);/i);
    if (target) {
        content = content.replace(target[0], target[0] + \`\\n\\n    // Scroll to bottom when typing indicators appear\\n    useEffect(() => {\\n        if (typingUsers && typingUsers.length > 0) {\\n            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });\\n        }\\n    }, [typingUsers.length]);\`);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Typing Scroll fixed successfully via Regex!');
    } else {
        console.log('Regex target failed!');
    }
} else {
    console.log('Core anchor strings not found!');
}
