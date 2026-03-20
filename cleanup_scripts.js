const fs = require('fs');
const files = [
    'edit_messagelist_typing.js',
    'edit_typing_safe.js',
    'edit_typing_simple.js',
    'edit_socket_typing.js',
    'edit_messagelist_lift.js'
];

files.forEach(f => {
    try {
        if (fs.existsSync(f)) {
            fs.unlinkSync(f);
            console.log(`Deleted: \${f}`);
        }
    } catch (e) {
        console.error(`Error deleting \${f}:`, e.message);
    }
});
