const fs = require('fs');
const path = require('path');

try {
    const rawData = fs.readFileSync(path.join(__dirname, 'openings_raw.txt'), 'utf8');
    const lines = rawData.split('\n');

    const openings = [];

    lines.forEach(line => {
        if (!line.trim()) return;
        
        // Regex to match Name followed by Number (with commas)
        const match = line.match(/^(.*?)(\d{1,3}(?:,\d{3})*)$/);
        
        if (match) {
            const name = match[1].trim();
            const countStr = match[2].replace(/,/g, '');
            const count = parseInt(countStr, 10);
            
            openings.push({ name, count });
        }
    });

    const outputPath = path.join(__dirname, 'src', 'data', 'openings.json');
    fs.writeFileSync(outputPath, JSON.stringify(openings, null, 2));
    console.log('Processed ' + openings.length + ' openings.');
} catch (err) {
    console.error(err);
}
