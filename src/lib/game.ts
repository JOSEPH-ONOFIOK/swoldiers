// The game as designed. The landing page and the docs both read from here,
// so a balance change only needs editing once.

export type Front = {
  id: string;
  tag: string;
  name: string;
  danger: "None" | "Low" | "Medium" | "High" | "Very high";
  line: string;
  enemies: string;
  quest: string;
  tip: string;
};

export const FRONTS: Front[] = [
  {
    id: "base",
    tag: "Safe",
    name: "Fort Gainz",
    danger: "None",
    line: "The only safe ground. Armory, gym, workshop and the black market. No shooting allowed.",
    enemies: "None. Nobody can hurt you inside the walls.",
    quest: "—",
    tip: "Check your loadout and train at the gym before you deploy.",
  },
  {
    id: "f1",
    tag: "Front 1",
    name: "The Outskirts",
    danger: "Low",
    line: "Burned farms, feral dogs and scavengers. Your first loot.",
    enemies: "Feral dogs in packs, scavengers around the farmhouses.",
    quest: "Clear the outskirts: take down 6 scavengers.",
    tip: "Dogs rush you. Back up while you shoot and let the Shotgun Blast catch the pack.",
  },
  {
    id: "f2",
    tag: "Front 2",
    name: "Rust Yard",
    danger: "Medium",
    line: "Raiders and scrap drones hide among wrecked trucks.",
    enemies: "Raiders behind cover, scrap drones that fly over it.",
    quest: "Ground the drones: down 5 scrap drones.",
    tip: "Drones ignore cover. Keep moving and shoot them first.",
  },
  {
    id: "f3",
    tag: "Front 3",
    name: "Dead City",
    danger: "Medium",
    line: "Snipers in the towers, rifle squads in the streets. Smoke everywhere.",
    enemies: "Riflemen in squads of three, snipers on the rooftops.",
    quest: "Silence the towers: take out 4 snipers.",
    tip: "A red laser means a sniper is aiming. Roll out of it.",
  },
  {
    id: "f4",
    tag: "Front 4",
    name: "Tank Line",
    danger: "High",
    line: "Armored columns roll through the trenches. Bring explosives.",
    enemies: "Flamers on foot, light tanks on the roads.",
    quest: "Break the line: knock out 3 light tanks.",
    tip: "Frag Grenades and Airstrike do full damage to tanks. Rifles barely scratch them.",
  },
  {
    id: "raid",
    tag: "Raid",
    name: "The Black Site",
    danger: "High",
    line: "An underground lab. Shock troopers in tight halls. Squad up.",
    enemies: "Packs of shock troopers, room after room.",
    quest: "Clear the site: secure 4 rooms.",
    tip: "Fights are close. Flex to pull the pack onto you, then Shotgun Blast.",
  },
  {
    id: "f5",
    tag: "Front 5",
    name: "The Citadel",
    danger: "Very high",
    line: "The last fortress. Two world bosses. Do not come alone.",
    enemies: "Shock troopers, light tanks and two world bosses: the Iron Colonel and the Mammoth.",
    quest: "Topple the Citadel: defeat a world boss.",
    tip: "Clear the tanks first so they do not join the boss fight.",
  },
];

export type Enemy = { name: string; where: string; hp: number; dmg: number; xp: number; boss?: boolean; note?: string };

export const ENEMIES: Enemy[] = [
  { name: "Feral dog", where: "The Outskirts", hp: 30, dmg: 4, xp: 5, note: "Fast, in packs." },
  { name: "Scavenger", where: "The Outskirts", hp: 45, dmg: 6, xp: 8 },
  { name: "Raider", where: "Rust Yard", hp: 70, dmg: 8, xp: 12, note: "Hides behind cover." },
  { name: "Scrap drone", where: "Rust Yard", hp: 60, dmg: 10, xp: 14, note: "Flies over cover." },
  { name: "Rifleman", where: "Dead City", hp: 90, dmg: 10, xp: 18 },
  { name: "Sniper", where: "Dead City", hp: 70, dmg: 22, xp: 24, note: "Slow shots, huge damage." },
  { name: "Flamer", where: "Tank Line", hp: 130, dmg: 12, xp: 26, note: "Short range, burns over time." },
  { name: "Light tank", where: "Tank Line, The Citadel", hp: 220, dmg: 18, xp: 40, note: "Takes full damage only from explosives." },
  { name: "Shock trooper", where: "The Black Site, The Citadel", hp: 150, dmg: 15, xp: 34 },
  { name: "Iron Colonel", where: "The Citadel", hp: 600, dmg: 24, xp: 120, boss: true, note: "Calls in reinforcements at half health." },
  { name: "The Mammoth", where: "The Citadel", hp: 900, dmg: 30, xp: 180, boss: true, note: "A super-heavy tank. Shell blasts leave fire on the ground." },
];

export type Skill = { key: string; name: string; cooldown: string; power: string; what: string };

export const SKILLS: Skill[] = [
  { key: "1", name: "Rifle", cooldown: "None", power: "×1", what: "Your main gun. Aim with the mouse, hold to fire. R reloads." },
  { key: "2", name: "Shotgun Blast", cooldown: "2.5 s", power: "×1.5 each", what: "A wide blast in front of you. Best up close." },
  { key: "3", name: "Frag Grenade", cooldown: "4 s", power: "×1.3 each", what: "Thrown where you aim. Hits a small area. Full damage to tanks." },
  { key: "4", name: "Flex", cooldown: "10 s", power: "+40% for 5 s", what: "Pump up: you hit 40% harder for 5 seconds and nearby enemies turn on you." },
  { key: "5", name: "Airstrike", cooldown: "12 s", power: "×2.5 each", what: "Marks a line where you aim. Shells land a second later. Your hardest hit." },
  { key: "6", name: "Med Kit", cooldown: "8 s", power: "+35% health", what: "Heals 35% of your health at once." },
];

export const FEATURES = [
  { title: "Fast combat", text: "Twin-stick shooting with a rifle and five skills on your hotbar: shotgun, frags, airstrikes, a med kit and Flex." },
  { title: "Get swol", text: "Train Strength, Endurance and Agility at the Fort Gainz gym. Gains carry into every fight." },
  { title: "Loadouts", text: "Pick your rifle, armor and gear in the armory before you deploy. Each front rewards a different kit." },
  { title: "Field workshop", text: "Salvage scrap on the front and build weapon mods: scopes, drums, barrels and plates." },
  { title: "Black market", text: "Buy and sell with other players at the price you set." },
  { title: "Squads", text: "Team up for the Black Site raid and the Citadel bosses. Loot drops for everyone who fought." },
];
