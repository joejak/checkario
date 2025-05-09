export const chinesecheckerboard = () => {
  let rows = 16;
  let rowCount = [1, 2, 3, 4, 13, 12, 11, 10, 9, 10, 11, 12, 13, 4, 3, 2, 1];
  let neighborings: number[][] = [];
  let overall = 0;
  let board = [];
  for (const row of rowCount) {
    let arr = [];
    for (let i = 0; i < row; i++) {
      let neighbors = neighborings[overall];
      arr.push({
        id: overall++,
        piece: undefined,
        neighbors: neighbors ?? [],
      });
    }
    board.push(arr);
  }
  return board;
};

export interface Board {
    spaces: Space[], 
    teams: Map<number, Team>
}

export interface Space {
    x: number
    y: number
    z: number
    id: number
    owner: number
    occupant: null | {
      id: number
      team: Team
      strength: number
      moved: boolean
    }
}

export interface Team{
    id: number,
    bgcolor: string,
    color: string,
    homeSpaces: number[],
}

export const betterCCB = (): Board => {
  const cells = [];
  let overall = 0;
  var radius = 9;
  const skip = [
    172, 174, 183, 187, 199, 203, 211, 213, 198, 202, 182, 186, 129, 92, 61,
    137, 98, 171, 128, 91, 135, 127, 170, 169, 178, 180, 138, 99, 66, 96, 132,
    143, 106, 75, 110, 151, 157, 118, 85, 121, 163, 166, 125, 90, 119, 158, 144,
    107, 76, 111, 152, 181, 136, 97, 134, 133, 176, 175, 177, 179, 189, 146,
    109, 150, 197, 195, 148, 193, 191, 205, 160, 126, 167, 214, 215, 216, 207,
    168, 210, 162, 209, 161, 208, 206, 204, 159, 120, 188, 145, 108, 149, 196,
    147, 194, 192, 190,
  ];
  const startingFields = [
    [173, 130, 93, 62, 63, 64, 65, 95, 94, 131],
    [68, 70, 72, 74, 105, 103, 101, 140, 142, 185],
    [78, 80, 82, 84, 117, 115, 113, 154, 156, 201],
    [89, 88, 87, 86, 122, 123, 124, 165, 164, 212],
    [83, 81, 79, 77, 112, 114, 116, 155, 153, 200],
    [67, 69, 71, 73, 104, 102, 100, 139, 141, 184],
  ];
  for (var i = 0; i < radius; i++) {
    for (var j = -i; j <= i; j++)
      for (var k = -i; k <= i; k++)
        for (var l = -i; l <= i; l++)
          if (
            Math.abs(j) + Math.abs(k) + Math.abs(l) == i * 2 &&
            j + k + l == 0
          )
            cells.push({
              x: j,
              y: k,
              z: l,
              id: overall++,
              owner: -1,
              occupant: null,
            });
  }
  const teams = new Map<
    number,
    Team
  >();
  teams.set(1, {
    id: 1,
    bgcolor: "red",
    color: "white",
    homeSpaces: startingFields[0],
  });
  teams.set(2, {
    id: 2,
    bgcolor: "purple",
    color: "white",
    homeSpaces: startingFields[1],
  }),
    teams.set(3, {
      id: 3,
      bgcolor: "blue",
      color: "white",
      homeSpaces: startingFields[2],
    }),
    teams.set(4, {
      id: 4,
      bgcolor: "green",
      color: "white",
      homeSpaces: startingFields[3],
    }),
    teams.set(5, {
      id: 5,
      bgcolor: "yellow",
      color: "black",
      homeSpaces: startingFields[4],
    }),
    teams.set(6, {
      id: 6,
      bgcolor: "orange",
      color: "black",
      homeSpaces: startingFields[5],
    });
  const board = {
    spaces: cells.filter((c) => {
      return !skip.includes(c.id);
    }),
    teams: teams,
  };
  return board;
};
