const text = '**Quick Start**';
console.log('Original:', text);
console.log('After:', text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));

const text2 = '**What This Toolkit Covers**';
console.log('Original 2:', text2);
console.log('After 2:', text2.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));

// Try different regex patterns
console.log('Pattern 1:', text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'));
console.log('Pattern 2:', text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'));
console.log('Pattern 3:', text.replace(/\*\*(.*)\*\*/g, '<strong>$1</strong>'));
console.log('Pattern 4:', text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'));
