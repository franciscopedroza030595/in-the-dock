export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";
export type Category = "PATTERN" | "MATRIX" | "SYMBOL" | "SPATIAL" | "SEQUENCE";

export interface Challenge {
  id: string;
  category: Category;
  difficulty: Difficulty;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
}

export const POINTS: Record<Difficulty, number> = { EASY: 5, MEDIUM: 10, HARD: 20, EXPERT: 40 };

export const CAT_META: Record<Category, { emoji: string; label: string }> = {
  PATTERN:  { emoji: "📈", label: "Pattern Recognition" },
  MATRIX:   { emoji: "🔲", label: "Matrix Reasoning" },
  SYMBOL:   { emoji: "🔣", label: "Symbol Logic" },
  SPATIAL:  { emoji: "🔄", label: "Spatial Rotation" },
  SEQUENCE: { emoji: "🔢", label: "Sequence Completion" },
};

export const CHALLENGES: Challenge[] = [
  // PATTERN — EASY
  { id:"p1", category:"PATTERN", difficulty:"EASY",   prompt:"What comes next?\n\n2,  4,  6,  8,  ?",           options:["9","10","12","14"],        answer:"10",  explanation:"Add 2 each step: even numbers sequence." },
  { id:"p2", category:"PATTERN", difficulty:"EASY",   prompt:"What comes next?\n\n5,  10,  15,  20,  ?",         options:["22","24","25","30"],       answer:"25",  explanation:"Multiply by 5: counting in fives." },
  { id:"p3", category:"PATTERN", difficulty:"MEDIUM", prompt:"What comes next?\n\n1,  1,  2,  3,  5,  8,  ?",   options:["10","11","13","12"],       answer:"13",  explanation:"Fibonacci: each number = sum of previous two (5+8=13)." },
  { id:"p4", category:"PATTERN", difficulty:"MEDIUM", prompt:"What comes next?\n\n2,  6,  18,  54,  ?",          options:["108","162","216","270"],   answer:"162", explanation:"Multiply by 3 each step (54×3=162)." },
  { id:"p5", category:"PATTERN", difficulty:"HARD",   prompt:"What comes next?\n\n3,  6,  12,  24,  48,  ?",    options:["72","84","96","100"],      answer:"96",  explanation:"Double each step (48×2=96)." },
  { id:"p6", category:"PATTERN", difficulty:"HARD",   prompt:"What comes next?\n\n1,  4,  9,  16,  25,  ?",     options:["30","32","36","42"],       answer:"36",  explanation:"Perfect squares: 1², 2², 3², 4², 5², 6²=36." },
  { id:"p7", category:"PATTERN", difficulty:"EXPERT", prompt:"What comes next?\n\n2,  3,  5,  7,  11,  13,  ?", options:["14","15","17","19"],       answer:"17",  explanation:"Prime numbers: 17 is the next prime after 13." },
  { id:"p8", category:"PATTERN", difficulty:"EXPERT", prompt:"What comes next?\n\n1,  2,  6,  24,  120,  ?",    options:["480","600","720","840"],   answer:"720", explanation:"Factorials: 1!, 2!, 3!, 4!, 5!, 6!=720." },

  // MATRIX — EASY
  { id:"m1", category:"MATRIX", difficulty:"EASY",   prompt:"Complete the analogy:\n\nBig is to Small\nas\nFast is to ?",    options:["Quick","Slow","Speed","Run"],   answer:"Slow",    explanation:"Antonym (opposite): Big↔Small, Fast↔Slow." },
  { id:"m2", category:"MATRIX", difficulty:"EASY",   prompt:"Complete the analogy:\n\nDoctor is to Hospital\nas\nTeacher is to ?", options:["Lesson","Book","School","Student"], answer:"School", explanation:"A doctor works in a hospital; a teacher works in a school." },
  { id:"m3", category:"MATRIX", difficulty:"MEDIUM", prompt:"Complete the analogy:\n\nFish is to Water\nas\nBird is to ?",   options:["Wing","Egg","Sky","Nest"],       answer:"Sky",     explanation:"Fish live in water; birds live in the sky." },
  { id:"m4", category:"MATRIX", difficulty:"MEDIUM", prompt:"Complete the analogy:\n\nHand is to Glove\nas\nFoot is to ?",   options:["Walk","Sock","Floor","Ankle"],  answer:"Sock",    explanation:"A glove covers a hand; a sock covers a foot." },
  { id:"m5", category:"MATRIX", difficulty:"HARD",   prompt:"Complete the analogy:\n\nChapter is to Book\nas\nScene is to ?", options:["Actor","Camera","Play","Stage"], answer:"Play",    explanation:"A chapter is a part of a book; a scene is a part of a play." },
  { id:"m6", category:"MATRIX", difficulty:"EXPERT", prompt:"Complete the analogy:\n\nGenetics is to Biology\nas\nSyntax is to ?", options:["Grammar","Language","Writing","Letter"], answer:"Language", explanation:"Genetics is the study of biology's code; syntax is the code of language." },

  // SYMBOL — EASY
  { id:"s1", category:"SYMBOL", difficulty:"EASY",   prompt:"What comes next?\n\n▲  ■  ▲  ■  ▲  ?",       options:["▲","■","●","◆"],   answer:"■",    explanation:"Alternating triangle/square pattern." },
  { id:"s2", category:"SYMBOL", difficulty:"EASY",   prompt:"What comes next?\n\n●  ○  ●  ○  ●  ?",       options:["●","○","■","▲"],   answer:"○",    explanation:"Alternating filled/empty circles." },
  { id:"s3", category:"SYMBOL", difficulty:"MEDIUM", prompt:"If ★ = 3 and ▲ = 5\n\nWhat is ★ + ▲ + ★?", options:["8","9","11","13"],  answer:"11",   explanation:"3 + 5 + 3 = 11." },
  { id:"s4", category:"SYMBOL", difficulty:"MEDIUM", prompt:"What comes next?\n\n■■  ●  ■■  ●  ■■  ?",   options:["■■","●","■","●●"], answer:"●",    explanation:"Pattern: two squares, then one circle, repeating." },
  { id:"s5", category:"SYMBOL", difficulty:"HARD",   prompt:"What comes next?\n\n▲  ▲▲  ▲▲▲  ▲▲▲▲  ?", options:["▲▲","▲▲▲▲▲","▲▲▲","▲"], answer:"▲▲▲▲▲", explanation:"Each step adds one triangle: 1,2,3,4,5." },
  { id:"s6", category:"SYMBOL", difficulty:"EXPERT", prompt:"If ◆ = 2, ● = 3, ■ = 5\n\n◆ × ● + ■ = ?", options:["10","11","13","16"],  answer:"11",   explanation:"(2×3)+5 = 6+5 = 11." },

  // SPATIAL — MEDIUM
  { id:"sp1", category:"SPATIAL", difficulty:"EASY",   prompt:"A shape points UP.\nRotated 90° clockwise.\nWhich direction now?",   options:["Left","Right","Down","Up"],     answer:"Right",  explanation:"90° clockwise: Up → Right." },
  { id:"sp2", category:"SPATIAL", difficulty:"MEDIUM", prompt:"A clock shows 3:00.\nThe face is rotated 180°.\nWhat time does it show?", options:["9:00","6:00","12:00","3:30"], answer:"9:00",   explanation:"180° rotation: the 3 moves to the 9 position." },
  { id:"sp3", category:"SPATIAL", difficulty:"HARD",   prompt:"North is to your front.\nYou turn 90° right.\nThen 180° right.\nWhat direction faces you?", options:["North","South","East","West"], answer:"West", explanation:"Start facing North, turn 90° right → East, then 180° right → West." },

  // SEQUENCE — EASY
  { id:"sq1", category:"SEQUENCE", difficulty:"EASY",   prompt:"Complete the sequence:\n\nJanuary, March, May, ?",  options:["June","July","August","April"], answer:"July",      explanation:"Every other month starting Jan: Jan, Mar, May, Jul." },
  { id:"sq2", category:"SEQUENCE", difficulty:"EASY",   prompt:"Complete the sequence:\n\nZ,  Y,  X,  W,  ?",       options:["V","U","T","S"],               answer:"V",         explanation:"Reverse alphabet, one letter at a time." },
  { id:"sq3", category:"SEQUENCE", difficulty:"MEDIUM", prompt:"Complete the sequence:\n\n10,  9,  7,  4,  0,  ?", options:["-3","-4","-5","-6"],           answer:"-5",        explanation:"Differences: -1,-2,-3,-4,-5." },
  { id:"sq4", category:"SEQUENCE", difficulty:"HARD",   prompt:"Complete the sequence:\n\n31, 28, 31, 30, 31, 30, 31, ?", options:["28","30","31","29"],    answer:"31",        explanation:"Days per month (Jan-Aug). August has 31 days." },
  { id:"sq5", category:"SEQUENCE", difficulty:"EXPERT", prompt:"Complete the sequence:\n\n1, 8, 27, 64, 125, ?",   options:["196","200","216","225"],       answer:"216",       explanation:"Perfect cubes: 1³, 2³, 3³, 4³, 5³, 6³=216." },
];

export function getChallengeBatch(count: number, seenIds: string[] = []): Challenge[] {
  const unseen = CHALLENGES.filter(c => !seenIds.includes(c.id));
  const pool = unseen.length >= count ? unseen : CHALLENGES;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
