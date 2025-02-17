const hobbiesToVector = (hobbies) => {
    // Create a 100-dimensional vector
    const vector = new Array(100).fill(0);
    
    hobbies.forEach((hobby, index) => {
        // Convert hobby string to numbers and distribute across vector
        const hobbyString = hobby.toLowerCase();
        for (let i = 0; i < hobbyString.length; i++) {
            const charCode = hobbyString.charCodeAt(i);
            const position = (index * 10 + i) % vector.length;
            vector[position] = (charCode / 255); // Normalize to 0-1 range
        }
    });

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => magnitude ? val / magnitude : 0);
};

const calculateSimilarity = (vector1, vector2) => {
    if (vector1.length !== vector2.length) return 0;
    
    const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitude1 * magnitude2);
};

module.exports = { hobbiesToVector, calculateSimilarity };