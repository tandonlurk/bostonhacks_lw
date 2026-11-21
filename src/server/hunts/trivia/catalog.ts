// Questions about the bundled transit map and this game's scoring rules.
export const QUESTIONS = [
  { id: "aquarium", prompt: "Which line serves Aquarium?", options: ["Blue", "Red", "Orange", "Green"], answer: "Blue" },
  { id: "wonderland", prompt: "Which line goes to Wonderland?", options: ["Blue", "Orange", "Red", "Green"], answer: "Blue" },
  { id: "transfer", prompt: "Where do the Red and Orange lines meet?", options: ["Downtown Crossing", "Park Street", "State", "Haymarket"], answer: "Downtown Crossing" },
  { id: "forest", prompt: "Which line serves Forest Hills?", options: ["Orange", "Red", "Green", "Blue"], answer: "Orange" },
  { id: "city", prompt: "What do your team's points grow?", options: ["A shared city district", "Train fares", "Platform length", "Trip time"], answer: "A shared city district" },
  { id: "tokens", prompt: "How many points earn one CitiToken?", options: ["10", "5", "25", "100"], answer: "10" },
  { id: "silver", prompt: "Where do Silver Line ride points go?", options: ["Your home team", "A fifth team", "No team", "The highest-ranked team"], answer: "Your home team" },
  { id: "first", prompt: "What is the first verified ride bonus each day?", options: ["5 points", "50 points", "1 point", "25 points"], answer: "5 points" },
] as const;
export function question(id: string) { return QUESTIONS.find(q => q.id === id)!; }
