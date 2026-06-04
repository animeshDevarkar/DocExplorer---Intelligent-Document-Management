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

    // Replace template literal interpolation: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`
    content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/localhost:3001"\}/g, '');
    
    // Replace direct reference: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    content = content.replace(/process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/localhost:3001"/g, '""');

    // Replace nested template literal in auth-client: `${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`}`
    // Since we simplified it previously, the above regexes should catch it, but just in case:
    content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| \`\$\{process\.env\.NEXT_PUBLIC_API_URL \|\| "http:\/\/localhost:3001"\}\`\}/g, '');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated for proxy: ' + file);
    }
});
