const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'frontend', 'src'));

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace "http://localhost:3001..." with `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}...`
    content = content.replace(/"http:\/\/localhost:3001([^"]*)"/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}$1`');
    
    // Replace `http://localhost:3001...` with `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}...`
    // This requires handling existing template literals
    content = content.replace(/`http:\/\/localhost:3001([^`]*)`/g, '`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}$1`');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
    }
});
