const fs = require('fs');
const xml = fs.readFileSync('temp_docx/word/document.xml', 'utf8');
const text = xml.replace(/<[^>]+>/g, (match) => {
    if (match === '</w:p>' || match === '</w:br>') return '\n';
    return '';
});
console.log(text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'"));
