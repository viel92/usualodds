// Test rapide du calcul expectation_score corrigé

function calculateExpectationScore(standing, totalTeams) {
    const expectedPoints = (totalTeams - standing.rank + 1) * 2.0
    const actualPoints = standing.points || 0
    const rawScore = actualPoints / Math.max(expectedPoints, 1)
    
    return Math.min(2.0, Math.max(0.0, rawScore))
}

console.log('🔍 Test calculs expectation_score corrigés:')
console.log('==========================================')

// Test avec Montpellier (cas problématique)
const montpellier = { rank: 18, points: 16 }
const totalTeams = 18

const score = calculateExpectationScore(montpellier, totalTeams)
console.log(`Montpellier (rang 18, 16 pts): ${score} ✅`)

// Test autres cas
const testCases = [
    { rank: 1, points: 65, name: 'PSG' },
    { rank: 10, points: 42, name: 'Milieu tableau' },
    { rank: 18, points: 16, name: 'Montpellier' }
]

testCases.forEach(test => {
    const result = calculateExpectationScore(test, 18)
    console.log(`${test.name} (rang ${test.rank}, ${test.points} pts): ${result}`)
    
    if (result > 2.0) {
        console.log(`❌ OVERFLOW: ${result} > 2.0`)
    } else if (result < 0.0) {
        console.log(`❌ UNDERFLOW: ${result} < 0.0`)
    } else {
        console.log(`✅ OK: ${result} dans [0,2]`)
    }
})

console.log('\n💡 Maintenant expectation_score sera toujours entre 0 et 2')