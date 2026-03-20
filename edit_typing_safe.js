const fs = require('fs');
const file = 'c:\\xampp\\htdocs\\Projectss\\StudySync\\client\\src\\components\\chat\\MessageList.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<\/AnimatePresence>(\s*)<\/div>(\s*)<div\s*ref=\{bottomRef\}\s*\/>/i;

const innerHtml = `
                    {/* Typing Indicator */}
                    {typingUsers && typingUsers.length > 0 && (
                        <div className="flex items-end gap-2 mb-4 px-2 animate-in slide-in-from-bottom-1 duration-200">
                            <div className="flex -space-x-1.5 items-center">
                                {typingUsers.map((u) => (
                                    <img 
                                        key={u._id} 
                                        src={u.avatarUrl || "https://ui-avatars.com/api/?name=" + encodeURIComponent(u.name) + "&background=random"} 
                                        alt={u.name} 
                                        className="w-7 h-7 rounded-full border border-white dark:border-slate-800 object-cover shadow-sm" 
                                        title={u.name}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center px-1 py-1.5 bg-transparent">
                                <div className="flex gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-1.5 h-1.5 bg-slate-500 dark:bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                            </div>
                        </div>
                    )}
`;

if (regex.test(content)) {
    content = content.replace(regex, `</AnimatePresence>\x0a${innerHtml}\x0a</div>\x0a<div ref={bottomRef} />`);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Typing Indicator relocated successfully!');
} else {
    console.log('Regex target NOT found!');
}
