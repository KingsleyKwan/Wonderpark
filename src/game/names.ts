const FIRST = [
  "Agnes", "Boris", "Clara", "Desmond", "Edith", "Felix", "Greta", "Hugo",
  "Iris", "Jules", "Keiko", "Laszlo", "Mira", "Nigel", "Olga", "Percy",
  "Quinn", "Rosa", "Soren", "Tilda", "Ulrich", "Vera", "Wren", "Yves",
  "Zora", "Anil", "Bea", "Caleb", "Dina", "Ezra", "Fran", "Gwen",
];

const LAST = [
  "Pike", "Moss", "Vale", "Crowe", "Ash", "Bell", "Frost", "Hale",
  "Quinn", "Reed", "Shaw", "Webb", "Young", "Barr", "Cole", "Dunn",
];

const THOUGHTS = {
  hungry: [
    "I would commit a mild crime for a hot dog.",
    "The park has rides. The park has no food. Bold strategy.",
    "My stomach is writing a complaint.",
  ],
  thirsty: [
    "I would drink the fountain if it weren't decorative.",
    "Thirst is not a theme. Fix it.",
    "Is the creek potable. Asking for a friend. The friend is me.",
  ],
  toilet: [
    "I need a bathroom. You deleted them all, didn't you.",
    "There is a creek. That is not a restroom.",
    "This is no longer a park. This is a hostage situation.",
  ],
  lost: [
    "Where is the path. WHERE is the path.",
    "I am in a bush. This was not on the map.",
    "The exit is a rumor.",
  ],
  happy: [
    "I came for wonder. I am, reluctantly, having it.",
    "The horses on the roundabout made eye contact. I feel seen.",
    "10/10. Would queue again.",
  ],
  sick: [
    "The teacups have opinions about my lunch.",
    "I have seen my own skeleton. It was spinning.",
    "Nausea is not an attraction. Or is it.",
  ],
  angry: [
    "Wonderpark promised wonder. I got a queue.",
    "I have been here an hour and I am poorer and dizzier.",
    "The mascot waved. I did not wave back. This is war.",
  ],
  thrill: [
    "Again. Again. Louder.",
    "My hat has left the park. I have not. Yet.",
    "If this ride goes any faster I will write a good review.",
  ],
  gentle: [
    "If it spins faster than a kettle I will sit down.",
    "I came for painted horses, not physics.",
    "A bench with a view is also an attraction.",
  ],
  steady: [
    "A reasonable amount of terror, please.",
    "I will queue if the throttle looks honest.",
    "Not too slow. Not airborne. That is the deal.",
  ],
  tooSlow: [
    "I paid for velocity. This is a suggestion of motion.",
    "Crank it. My pulse is filing a complaint.",
    "A child could paint faster than this ride.",
  ],
  tooFast: [
    "I asked for a carousel, not an orbit.",
    "Slow it down. I have a dentist appointment.",
    "The horses are screaming. I am the horses.",
  ],
  match: [
    "This is exactly my speed. Do not tell Legal.",
    "Again. At this throttle. Forever.",
    "Whoever set this dial knows me.",
  ],
  refuse: [
    "That thing is going too fast. I will look at a tree.",
    "I am not getting on that. I have a spine.",
    "Too slow to be a ride. Too expensive to be a bench.",
  ],
  litter: [
    "This path is a crime scene of ice cream.",
    "I would pick it up, but I paid admission.",
    "A bin. A BIN. That's all I wanted.",
  ],
  fly: [
    "I am flying. This was not in the brochure.",
    "Tell my balloon I loved it.",
    "10/10 would launch again.",
  ],
  rain: [
    "I am becoming a fountain. This is not the attraction I paid for.",
    "An umbrella would be a kindness. Or a roof.",
    "The sky has opinions. I would like them to stop.",
  ],
  crowd: [
    "I can smell eight other admissions.",
    "This is no longer a queue. This is a compressed civilization.",
    "Personal space is a rumor at this park.",
  ],
  map: [
    "A map. Geography was not my hobby until today.",
    "I know where the toilets are. I am a god.",
    "The lost feeling has been professionally reduced.",
  ],
  photo: [
    "I have proof I survived the throttle.",
    "The photograph is better than the ride. Do not tell the ride.",
    "My face is a souvenir now. Legal can have it.",
  ],
  vandal: [
    "The bench started it.",
    "Art is a conversation. The bin lost.",
    "I am improving the scenery. You are welcome.",
  ],
  grass: [
    "The lawn is writing a novel. I am in chapter six.",
    "I came for rides. I got a meadow with opinions.",
    "Mow this. I am not a goat.",
  ],
  music: [
    "The brass section is doing more than the carousel.",
    "I forgive the queue. Briefly. The tuba asked nicely.",
    "Live music. The park has taste. Alarming.",
  ],
};

export function guestName(seed: number): string {
  const f = FIRST[Math.abs(seed) % FIRST.length];
  const l = LAST[Math.abs((seed * 17) >> 3) % LAST.length];
  return `${f} ${l}`;
}

export function pickThought(kind: keyof typeof THOUGHTS, seed: number): string {
  const list = THOUGHTS[kind];
  return list[Math.abs(seed | 0) % list.length]!;
}

export const MEMOS = {
  welcome_hollow: {
    from: "Regional Desk",
    title: "Welcome to Hollow Creek",
    body: "The park is yours. The creek is decorative. The guests are not. Lay paths, feed them, and for the love of the board install a toilet before noon. A Heritage Round is rusting in the weeds — hire a Ridewright or demolish it. We will be watching. Warmly, in the corporate sense.",
    tone: "info" as const,
  },
  welcome_fernwood: {
    from: "Directorate",
    title: "Fernwood is a photograph",
    body: "Keep the pines. Build a coaster that returns to the station. If guests become airborne, file it under 'engagement' and call the helicopter. Do not call us first.",
    tone: "info" as const,
  },
  first_guest: {
    from: "Admissions",
    title: "Someone came",
    body: "A guest has entered the park. Try not to lose them in the creek. Their wallet is the product.",
    tone: "good" as const,
  },
  first_break: {
    from: "Ridewrights",
    title: "It made a noise",
    body: "A ride has stopped in a way that suggests it will not start. Hire a Ridewright. Or wait. Waiting is cheaper until it isn't.",
    tone: "warn" as const,
  },
  airborne: {
    from: "Legal",
    title: "Re: trajectory",
    body: "A guest left a ride without using the exit. This is usually bad for business. The board notes it is not always bad for business. An invoice for the recovery helicopter is attached in spirit.",
    tone: "bad" as const,
  },
  death: {
    from: "Legal",
    title: "A quiet quarter",
    body: "We lost one. The rating will dip. The press may not. Send flowers, or a balloon. Do not send a quote.",
    tone: "bad" as const,
  },
  win: {
    from: "The Board",
    title: "You are not fired",
    body: "Objectives complete. Hollow Creek / Fernwood will be used in the annual report. You may now make it worse, for science. Complimentary cake is in another building.",
    tone: "good" as const,
  },
  seized: {
    from: "The Board",
    title: "Keys, please",
    body: "The park is no longer yours. Too few guests, too many explanations. A junior analyst will be along to water the hedges. You may keep the lanyard.",
    tone: "bad" as const,
  },
  vandal: {
    from: "Park Watch",
    title: "A bench has retired",
    body: "Someone treated the scenery as sport. Hire security before the flower beds unionize. We have attached a photograph of the wreckage in spirit only.",
    tone: "warn" as const,
  },
};
