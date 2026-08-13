const api_url = "https://catfact.ninja/fact";

// 1. We define getCatFact so your other function can use it
async function getCatFact() {
  const response = await fetch(api_url);
  const data = await response.json();
  return data;  
}

async function displayCatFact() {
  const catFact = await getCatFact();
  console.log("Here's a cat fact for you: " + catFact.fact);
}

displayCatFact();
