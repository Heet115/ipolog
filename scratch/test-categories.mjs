import assert from "node:assert/strict"
import {
  RETAIL_MAX_AMOUNT,
  SHNI_MAX_AMOUNT,
  getCategoryMinLots,
  getCategoryMaxLots,
  inferCategoryFromAmount,
  validateCategoryLots,
  CATEGORY_CONFIG,
} from "../lib/calculations/categories.ts"

console.log("🧪 Testing Category Calculations & SEBI Thresholds...")

// Test 1: Standard Mainboard IPO (Lot Size = 15, Issue Price = ₹1,000 -> Lot Cost = ₹15,000)
{
  const lotSize = 15
  const issuePrice = 1000
  const lotCost = 15000

  // Retail: min 1 lot, max 13 lots (13 * 15,000 = ₹1,95,000 <= 200,000)
  const minRetail = getCategoryMinLots("retail", lotSize, issuePrice)
  const maxRetail = getCategoryMaxLots("retail", lotSize, issuePrice)
  assert.equal(minRetail, 1, "Retail min lots should be 1")
  assert.equal(maxRetail, 13, "Retail max lots should be 13 (₹1,95,000)")

  // sHNI: min lots exceeding ₹2L -> 14 lots (14 * 15,000 = ₹2,10,000 > ₹2L), max 33 lots (33 * 15,000 = ₹4,95,000 <= ₹5L)
  const minShni = getCategoryMinLots("shni", lotSize, issuePrice)
  const maxShni = getCategoryMaxLots("shni", lotSize, issuePrice)
  assert.equal(minShni, 14, "sHNI min lots should be 14 (₹2,10,000)")
  assert.equal(maxShni, 33, "sHNI max lots should be 33 (₹4,95,000)")

  // bHNI: min lots exceeding ₹5L -> 34 lots (34 * 15,000 = ₹5,10,000 > ₹5L)
  const minBhni = getCategoryMinLots("bhni", lotSize, issuePrice)
  assert.equal(minBhni, 34, "bHNI min lots should be 34 (₹5,10,000)")

  console.log("✅ 1. Mainboard standard category min/max lots passed.")
}

// Test 2: SME IPO (Lot Size = 1000, Issue Price = ₹125 -> Lot Cost = ₹1,25,000)
{
  const lotSize = 1000
  const issuePrice = 125
  const lotCost = 125000

  // Retail: 1 lot (₹1,25,000)
  assert.equal(getCategoryMinLots("retail", lotSize, issuePrice), 1)
  assert.equal(getCategoryMaxLots("retail", lotSize, issuePrice), 1)

  // sHNI: 2 lots (2 * 125,000 = ₹2,50,000 > ₹2L)
  assert.equal(getCategoryMinLots("shni", lotSize, issuePrice), 2)
  assert.equal(getCategoryMaxLots("shni", lotSize, issuePrice), 4)

  // bHNI: 5 lots (5 * 125,000 = ₹6,25,000 > ₹5L)
  assert.equal(getCategoryMinLots("bhni", lotSize, issuePrice), 5)

  console.log("✅ 2. SME category min/max lots passed.")
}

// Test 3: inferCategoryFromAmount
{
  assert.equal(inferCategoryFromAmount(15000), "retail")
  assert.equal(inferCategoryFromAmount(195000), "retail")
  assert.equal(inferCategoryFromAmount(200000), "retail")
  assert.equal(inferCategoryFromAmount(210000), "shni")
  assert.equal(inferCategoryFromAmount(500000), "shni")
  assert.equal(inferCategoryFromAmount(510000), "bhni")
  assert.equal(inferCategoryFromAmount(1000000), "bhni")
  console.log("✅ 3. inferCategoryFromAmount passed.")
}

// Test 4: validateCategoryLots
{
  const lotSize = 15
  const issuePrice = 1000

  // Retail with 14 lots (₹2,10,000 > ₹2L) -> invalid
  const retailOver = validateCategoryLots("retail", 14, lotSize, issuePrice)
  assert.equal(retailOver.isValid, false)
  assert.ok(retailOver.warning?.includes("exceeds ₹2,00,000 limit"))

  // Retail with 13 lots (₹1,95,000) -> valid
  const retailValid = validateCategoryLots("retail", 13, lotSize, issuePrice)
  assert.equal(retailValid.isValid, true)

  // sHNI with 1 lot (₹15,000 < ₹2L) -> invalid
  const shniUnder = validateCategoryLots("shni", 1, lotSize, issuePrice)
  assert.equal(shniUnder.isValid, false)
  assert.ok(shniUnder.warning?.includes("requires amount > ₹2,00,000"))

  // sHNI with 14 lots (₹2,10,000) -> valid
  const shniValid = validateCategoryLots("shni", 14, lotSize, issuePrice)
  assert.equal(shniValid.isValid, true)

  // sHNI with 35 lots (₹5,25,000 > ₹5L) -> invalid
  const shniOver = validateCategoryLots("shni", 35, lotSize, issuePrice)
  assert.equal(shniOver.isValid, false)
  assert.ok(shniOver.warning?.includes("exceeds ₹5,00,000 limit"))

  // bHNI with 34 lots (₹5,10,000) -> valid
  const bhniValid = validateCategoryLots("bhni", 34, lotSize, issuePrice)
  assert.equal(bhniValid.isValid, true)

  console.log("✅ 4. validateCategoryLots passed.")
}

console.log("🎉 All Category Logic Tests Passed Successfully!")
