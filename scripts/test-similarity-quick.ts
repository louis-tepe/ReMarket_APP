#!/usr/bin/env ts-node

import { calculateSimilarityWithProductTypeBonus } from '../src/services/scraping/ledenicheur/ledenicheur.helpers';

console.log('🚀 Test rapide de l\'algorithme de similarité amélioré');

const testCases = [
  {
    search: 'Apple MacBook Pro M2',
    candidates: [
      'Apple MacBook Pro 13" M2 8GB 256GB',
      'Apple Leather Sleeve MacBook Pro 13"',
      'Apple MacBook Air M2 13"',
      'Speck MacBook Pro Case'
    ]
  }
];

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase.search}"`);
  
  const normalizedSearch = testCase.search.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').sort().join(' ');
  
  const results = testCase.candidates.map(candidate => {
    const normalizedCandidate = candidate.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(' ').sort().join(' ');
    const similarity = calculateSimilarityWithProductTypeBonus(
      testCase.search,
      candidate,
      normalizedSearch,
      normalizedCandidate
    );
    
    return { candidate, similarity };
  }).sort((a, b) => b.similarity - a.similarity);
  
  results.forEach((result, i) => {
    const emoji = i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📦';
    console.log(`  ${emoji} ${result.candidate}: ${result.similarity.toFixed(4)}`);
  });
}); 