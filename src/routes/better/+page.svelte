<script lang="ts">
  import { betterCCB, type Space, type Team } from "$lib/constan";
  import { onMount } from "svelte";

  let showDebugInfo = $state(false);

  const minScalar = 50;

  let board = $state(betterCCB());
  let scalar = $state(minScalar);
  let viewerH = $state(1080);
  let viewerW = $state(1920);
  let defaultSpaceColor = "white";
  let colorMap: {
    id: number;
    bgcolor: string;
    color: string;
    owner: number;
  }[] = $state([]);
  let selected: null | Space = $state(null);
  let hovered: null | Space = $state(null);
  let jumpStart: null | HTMLElement = $state(null);
  let dragElement: null | HTMLElement = $state(null);
  let dropTarget: null | HTMLElement = $state(null);
  let range = $state(1);
  let playerCount = $state(2);
  let currentPlayer: null | Team = $state(null);
  let activePlayers: Team[] = $state([]);

  function getProjection(cell: {
    id: number;
    x: number;
    y: number;
    z: number;
  }) {
    return {
      w:
        (viewerW > 500 && viewerW > viewerH ? scalar * 1.5 : scalar / 10) +
        (scalar / 2) * 8 +
        (scalar / 3) * (cell.x - cell.y / 2 - cell.z / 2),
      h: viewerH / 2 + ((scalar / 3) * (cell.y - cell.z) * Math.sqrt(3)) / 2,
    };
  }

  onMount(() => {
    const body = document.body;
    const html = document.documentElement;

    const resize = () => {
      viewerH = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
      viewerW = Math.max(
        body.scrollWidth,
        body.offsetWidth,
        html.clientWidth,
        html.scrollWidth,
        html.offsetWidth
      );
      viewerH = viewerH - scalar;
      viewerW = viewerW - scalar;
      scalar = Math.max(Math.min(...[viewerH, viewerW]) / 8, minScalar);
    };
    console.log(board);
    viewerH = viewerH - scalar;
    viewerW = viewerW - scalar;
    scalar = Math.max(Math.min(...[viewerH, viewerW]) / 8, minScalar);
    window.addEventListener("mousedown", (e) => {
      selected = null;
    });
    window.addEventListener("mouseup", (e) => {
      selected = null;
      dropTarget = null;
    });
    window.addEventListener("contextmenu", (e) => {
      handleRightClick(e);
    });
    window.addEventListener("resize", resize);
    const homeSpaces: {
      id: number;
      bgcolor: string;
      color: string;
      owner: number;
    }[] = [];
    window.addEventListener("DOMContentLoaded", resize);

    for (const team of Array.from(board.teams)) {
      team[1].homeSpaces.map((cell) => {
        homeSpaces.push({
          id: cell,
          color: team[1].color,
          bgcolor: team[1].bgcolor,
          owner: team[1].id,
        });
      });
    }

    console.log(homeSpaces);

    for (const spaces of board.spaces) {
      if (
        homeSpaces.findIndex((v) => {
          v.id == spaces.id;
        }) < 0
      ) {
        homeSpaces.push({
          id: spaces.id,
          bgcolor: defaultSpaceColor,
          color: "white",
          owner: -1,
        });
      }
    }
    colorMap = homeSpaces;

    console.log(board.spaces);
    console.log(homeSpaces);

    for (const cell of board.spaces) {
      for (const space of homeSpaces) {
        if (space.id == cell.id) {
          console.log(cell.id, " -> ", cell.owner);
          cell.owner = space.owner;
          break;
        }
      }
    }

    resize();
  });

  function resetBoard(numPlayers: number) {
    activePlayers = [];
    dice = [];
    currentPlayer = null;
    for (const space of board.spaces) {
      space.occupant = null;
    }

    if (numPlayers < 1 || numPlayers == 5 || numPlayers > 6)
      throw new Error("unsuitable number of players: " + numPlayers);
    let set: number[] = [];
    if (numPlayers == 1) {
      set = [1];
    }
    if (numPlayers == 2) {
      set = [1, 4];
    }
    if (numPlayers == 3) {
      set = [1, 3, 5];
    }
    if (numPlayers == 4) {
      set = [1, 2, 4, 5];
    }
    if (numPlayers == 6) {
      set = [1, 2, 3, 4, 5, 6];
    }

    for (const player of set) {
      let team = board.teams.get(player);
      if (team) {
        for (const space of board.spaces) {
          if (team.homeSpaces.includes(space.id)) {
            space.occupant = {
              id: space.id,
              strength: 1,
              team: team,
              moved: false,
            };
          }
        }
        activePlayers.push(team);
      }
    }
    determinePlayerOrder();
  }

  let dice: { die: number; player: Team }[] = $state([]);
  let rollerDelay = 50;
  function determinePlayerOrder() {
    dice = [];
    if (activePlayers) {
      for (const player of activePlayers) {
        dice.push({ die: 6, player: player });
      }
      handleRoll(rollerDelay);
    }
  }

  let rolling = $state(false);
  let startingPlayer: null | Team = $state(null);
  function handleRoll(rollerDelay: number) {
    rolling = true;
    for (let i = 0; i < dice.length; i++) {
      dice[i].die = Math.floor(Math.random() * 5) + 1;
    }

    rollerDelay += rollerDelay * 0.2;
    if (rollerDelay > 1000) rollerDelay = 900;
    if (rollerDelay > 800 && dice.length > 1) {
      const sorted = dice.toSorted((a, b) => {
        return b.die - a.die;
      });
      if (sorted[0].die != sorted[1].die) {
        currentPlayer = sorted[0].player;
        startingPlayer = currentPlayer;
        return;
      }
    }
    setTimeout(() => {
      handleRoll(rollerDelay);
    }, rollerDelay);
  }

  let gameRunning = $state(false);
  function startGame() {
    rolling = false;
    gameRunning = true;
    console.log("start game");
  }

  function nextTurn() {
    pieceMoved = false;
    let remaining = 0;
    for (const team of activePlayers) {
      if (getTeamStrength(team.id).pieces > 0) {
        remaining++;
      }
    }

    if (!(remaining > 1)) {
      endGame();
      return;
    }

    for (const cell of board.spaces) {
      if (cell.occupant) cell.occupant.moved = false;
    }

    let nextindex = currentPlayer ? currentPlayer.id % activePlayers.length : 0;
    currentPlayer = activePlayers[nextindex];

    if (!startingPlayer)
      throw new Error(
        "starting player null on next turn, shouldn't be possible."
      );
    if (startingPlayer.id == activePlayers[nextindex].id) {
      nextRound();
    }
    if (getTeamStrength(activePlayers[nextindex].id).totalP < 1) {
      nextTurn();
    }
  }

  function nextRound() {
    console.log("new round!");
    for (const cell of board.spaces) {
      if (cell.owner == -1) {
        if (!cell.occupant || cell.occupant.id == -1) {
          if (
            Math.random() * 512 <
            6 -
              Math.abs(cell.x) +
              (6 - Math.abs(cell.y)) +
              (6 - Math.abs(cell.z))
          ) {
            if (cell.occupant && cell.occupant.id == -1) {
              cell.occupant.strength++;
            } else {
              cell.occupant = {
                id: -1,
                moved: false,
                strength: 1,
                team: {
                  bgcolor: "white",
                  color: "black",
                  homeSpaces: [],
                  id: -1,
                },
              };
            }
          }
        }
      }
    }
  }

  function endGame() {
    const survivors = activePlayers.filter((ap) => {
      return getTeamStrength(ap.id).pieces > 0;
    });
    console.log(survivors);
    if (survivors.length > 0) {
      const winner = survivors[0];
      alert(`Game Over! ${winner.bgcolor} team wins!`);
      return;
    } else {
      alert(`Game Over! DRAW!`);
    }

    for (const cell of board.spaces) {
      cell.occupant = null;
    }
  }

  function getTeamStrength(id: number) {
    let totStr = 0;
    let pieces = 0;
    for (const cell of board.spaces) {
      let occ = cell.occupant;
      if (occ && occ.team && occ.team.id == id) {
        totStr += occ.strength;
        pieces++;
      }
    }
    return { totalP: totStr, pieces: pieces };
  }

  function isNeighbor(cell1: Space, cell2: Space) {
    let r = range;
    if (cell1 == cell2) return false;
    if (cell1 && cell1.occupant && cell1.occupant.strength) {
      return calcJumpEnergy(cell1, cell2) < cell1.occupant.strength;
    }
    return false;
  }

  function handleRangeChange(
    e: Event & { currentTarget: EventTarget & HTMLInputElement }
  ) {
    if (e != null) {
      range = parseInt(e.currentTarget?.value ?? 1);
      console.log(range);
    }
  }

  async function handleRightClick(e: MouseEvent) {
    console.log('right click');
    if(selected && selected.occupant && dragElement){
      dragElement.dispatchEvent(new DragEvent('dragend', {
        bubbles: true, 
        cancelable: true, 
        clientX: 0,
        clientY: 0,
      }))
    }
    e.preventDefault();
  }

  async function drag() {}

  async function handleDragStart(
    e: DragEvent & {
      currentTarget: EventTarget & HTMLElement;
    }
  ) {
    //e.preventDefault();
    if (e && e.dataTransfer) {
      e.dataTransfer.setData("text/plain", "Draggable");
      e.dataTransfer.setDragImage(document.createElement("img"), 0, 0);
      dragElement = e.currentTarget;
    }
  }

  async function handleDragEnd(
    e: DragEvent & {
      currentTarget: EventTarget & HTMLElement;
    }
  ) {
    selected = null;
    dragElement = null;
    //e.preventDefault();
  }

  async function handleDragEnter(
    e: DragEvent & {
      currentTarget: EventTarget & HTMLElement;
    },
    cell: Space
  ) {
    if (selected && isNeighbor(selected, cell)) {
      e.preventDefault();
    }
  }

  async function handleDragLeave(
    e: DragEvent & {
      currentTarget: EventTarget & HTMLElement;
    },
    cell: Space
  ) {
    hovered = null;
  }

  async function handleDragOver(
    e: DragEvent & {
      currentTarget: EventTarget & HTMLElement;
    },
    cell: Space
  ) {
    if (selected && isNeighbor(selected, cell)) {
      if (!cell.occupant) {
        e.preventDefault();
        hovered = cell;
        if (dropTarget != e.currentTarget) {
          dropTarget = e.currentTarget;
        }
      } else if (cell.occupant) {
        hovered = cell;
        e.preventDefault();
        if (dropTarget != e.currentTarget) {
          dropTarget = e.currentTarget;
        }
      }
    }
  }

  let pieceMoved = $state(false);

  async function handleDropEvent(e: DragEvent, cell: Space) {
    if (selected && selected.occupant) {
      selected.occupant.moved = true;
      pieceMoved = true;
      selected.occupant.team;
      selected.occupant.strength =
        selected.occupant.strength - calcJumpEnergy(selected, cell);
      if (cell.occupant && cell.occupant.team.id != selected.occupant.team.id) {
        //valid take (landed on enemy piece or neutral piece)
        if (cell.occupant.team.id == -1) {
          //neutral take
          selected.occupant.strength += cell.occupant.strength;
          cell.occupant = selected.occupant;
          selected.occupant = null;
          return;
        } else {
          //enemy take
          if (selected.occupant.strength > cell.occupant.strength) {
            //jumper is stronger
            selected.occupant.strength -= cell.occupant.strength;
            cell.occupant = selected.occupant;
            selected.occupant = null;
            return;
          } else {
            //enemy is stronger
            cell.occupant.strength -= selected.occupant.strength;
            selected.occupant = null;
            if (cell.occupant.strength < 1) {
              cell.occupant = null;
            }
            nextTurn();
          }
        }
      } else if (
        cell.occupant &&
        cell.occupant.team.id == selected.occupant.team.id
      ) {
        selected.occupant.strength += cell.occupant.strength;
        cell.occupant = selected.occupant;
        selected.occupant = null;
        return;
      } else {
        cell.occupant = selected.occupant;
        selected.occupant = null;
      }

      nextTurn();
    }
  }

  function calcJumpEnergy(start: Space, end: Space) {
    let xn = Math.abs(start.x - end.x);
    let yn = Math.abs(start.y - end.y);
    let zn = Math.abs(start.z - end.z);
    let tot = Math.max(xn, yn, zn);
    console.log(xn, yn, zn, tot);
    return 2**tot - 2;
  }

  let battling = $state(false);

  let showSettings = $state(false);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  style="display:flex; flex-direction:row; margin-left: 50px; margin-right: 50px; height:100vh; align-items:center; color: lightsteelblue;
    font-family: monospace;
    font-size: x-large;"
>
  <fieldset
    style="align-self:start; margin: 1rem; max-width: 250px; z-index: 1; background: black; {showSettings
      ? ''
      : 'height: 0px; width: 0px;'} contain: content; "
  >
    <legend>
      <button
        style="width: 130px; margin-top: 16px;"
        onclick={() => {
          showSettings = !showSettings;
        }}>settings {!showSettings ? "△" : "▽"}</button
      >
    </legend>
    <div style="padding-top: 15px;">
      <span
        ><label>Debug Mode: </label><input
          type="checkbox"
          bind:checked={showDebugInfo}
        /></span
      >
      <span
        ><label>Range</label> <span style="float:right;"> {range}</span></span
      >
      <input
        type="range"
        name=""
        id=""
        min="1"
        defaultValue="1"
        max="5"
        onmousemove={(e) => {
          handleRangeChange(e);
        }}
        onchange={(e) => {
          handleRangeChange(e);
        }}
      />

      <form>
        <fieldset>
          <legend>number of players</legend>
          <div>
            <input
              name="numberOfPlayers"
              onclick={() => {
                playerCount = 1;
              }}
              value="1"
              type="radio"
            />
            <label> 1 player</label>
          </div>
          <div>
            <input
              name="numberOfPlayers"
              onclick={() => {
                playerCount = 2;
              }}
              value="2"
              type="radio"
              checked
            />
            <label> 2 player</label>
          </div>
          <div>
            <input
              name="numberOfPlayers"
              onclick={() => {
                playerCount = 3;
              }}
              value="3"
              type="radio"
            />
            <label> 3 player</label>
          </div>
          <div>
            <input
              name="numberOfPlayers"
              onclick={() => {
                playerCount = 4;
              }}
              value="4"
              type="radio"
            />
            <label> 4 player</label>
          </div>
          <div>
            <input
              name="numberOfPlayers"
              onclick={() => {
                playerCount = 6;
              }}
              value="6"
              type="radio"
            />
            <label> 6 player</label>
          </div>
        </fieldset>
      </form>

      <button
        type="button"
        onclick={() => {
          resetBoard(playerCount);
        }}
      >
        Reset
      </button>
    </div>
  </fieldset>
  {#if gameRunning && currentPlayer}
    <div style="margin-left: {(scalar / 2) * 18}px;">
      <fieldset style="border-color:white;">
        <legend>turn order</legend>
        {#each activePlayers as player, index}
          {#if startingPlayer && player.id == startingPlayer.id}
            <div
              style="height: 10px; width: 12vw; max-width: 250px; background-color: #ffffff99; border: solid thick transparent; display: flex; justify-content: center; align-items: center;"
            >
              <p
                style="font-size: medium; color: black; margin: 0px; padding: 0px; width:%100; "
              >
                <em>end of round</em>
              </p>
            </div>
          {/if}
          <div
            style="height: 10vh; width: 12vw; max-width: 250px; background-color: {player.bgcolor}; {currentPlayer.id ==
            player.id
              ? 'border: solid thick aqua;'
              : 'border: solid thick transparent;'}
            display: flex; padding: .5rem;
            font-size: medium;"
          >
            <fieldset
              style="color:{player.color}; border-color:{player.color};  width: 100%;"
            >
              <legend>player <span>{index}</span></legend>
              <table style="width: 100%; ">
                <tbody>
                  <tr>
                    <th>total strength</th>
                    <td>{getTeamStrength(player.id).totalP}</td>
                  </tr>
                  <tr>
                    <th>pieces</th>
                    <td>{getTeamStrength(player.id).pieces}</td>
                  </tr>
                </tbody>
              </table>
            </fieldset>
            {#if player.id == currentPlayer.id}
              <svg
                style="position: absolute;
                      transform: scale(.5, .5) translate(500px, -50px);"
                width="156.26584"
                height="180.37102"
                viewBox="0 0 41.345337 47.723165"
                version="1.1"
                id="svg3330"
              >
                <defs id="defs3327" />
                <g id="layer1" transform="translate(-15.700967,-104.65386)">
                  <path
                    style="fill:{player.bgcolor};fill-opacity:0;stroke:{player.bgcolor};stroke-width:2.64583;stroke-linecap:round;stroke-linejoin:round"
                    d="m 55.723387,105.97668 -38.699636,21.72701 38.673324,23.35052 z"
                    id="path3451"
                  />
                  <path
                    style="fill:{player.bgcolor};fill-opacity:0;stroke:{player.bgcolor};stroke-width:2.64583;stroke-linecap:round;stroke-linejoin:round"
                    d="M 55.452532,116.11052 35.71519,127.67819 55.235637,141.05331 Z"
                    id="path3453"
                  />
                </g>
              </svg>
            {/if}
          </div>
        {/each}
      </fieldset>

      <button
        onclick={() => {
          nextTurn();
        }}>End Turn</button
      >
    </div>
  {/if}
  {#if rolling}
    <div
      class="useopenin"
      style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1;  height: 300px; width: 0px; border: solid white; border-radius: 50px; background: {document
        .getElementsByTagName('body')
        .item(0)?.style
        .backgroundColor}; transistion: all 1s ease-out; display: flex; flex-direction:column;
    justify-content: space-evenly;
    align-items: center;"
      onanimationend={(e) => {
        e.currentTarget.style.width = "800px";
      }}
    >
      <div
        style="width:100%; flex-grow: 1; display:flex;   justify-content: space-evenly;
    align-items: center;"
      >
        {#each dice as die}
          <div
            class="{!currentPlayer ? 'rolling' : ''} "
            style="width: 50px; height: 50px; background-color:{activePlayers
              ? die.player.bgcolor
              : 'transparent'}; color:{activePlayers
              ? die.player.color
              : 'white'};
                border-radius: 6px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: xxx-large;
            {currentPlayer != null && currentPlayer == die.player
              ? 'transform: scale(1.5,1.5); border:solid aqua thick;'
              : ''}
            transition: all 500ms;"
          >
            {die.die}
          </div>
        {/each}
      </div>
      {#if currentPlayer}
        <button
          style="font-size: xxx-large; margin: 1rem;"
          onclick={() => {
            startGame();
          }}>Start Game</button
        >
      {/if}
    </div>
  {/if}

  {#if battling}
    <div
      class="useopenin"
      style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1;  height: 300px; width: 0px; border: solid white; border-radius: 50px; background: {document
        .getElementsByTagName('body')
        .item(0)?.style
        .backgroundColor}; transistion: all 1s ease-out; display: flex; flex-direction:column;
  justify-content: space-evenly;
  align-items: center;"
      onanimationend={(e) => {
        e.currentTarget.style.width = "800px";
      }}
    >
      <div
        style="width:100%; flex-grow: 1; display:flex;   justify-content: space-evenly;
  align-items: center;"
      >
        {#each dice as die}
          <div
            class="{!currentPlayer ? 'rolling' : ''} "
            style="width: 50px; height: 50px; background-color:{activePlayers
              ? die.player.bgcolor
              : 'transparent'}; color:{activePlayers
              ? die.player.color
              : 'white'};
              border-radius: 6px;
          display: flex;
          justify-content: center;
          align-items: center;
          font-size: xxx-large;
          {currentPlayer != null && currentPlayer == die.player
              ? 'transform: scale(1.5,1.5); border:solid aqua thick;'
              : ''}
          transition: all 500ms;"
          >
            {die.die}
          </div>
        {/each}
      </div>
      {#if currentPlayer}
        <button
          style="font-size: xxx-large; margin: 1rem;"
          onclick={() => {
            startGame();
          }}>Start Game</button
        >
      {/if}
    </div>
  {/if}

  {#each board.spaces as cell}
    <button
      style="
        position: absolute;
        top: {getProjection(cell).h}px;
        left: {getProjection(cell).w}px;
        height: {scalar / 2}px; 
        width: {scalar / 2}px;
        border-radius: {scalar}px; 
        display:flex; 
        justify-content:center;
        background:radial-gradient(circle, rgba(0,0,0,0) 60%, {colorMap.find(
        (c) => {
          return c.id == cell.id;
        }
      )?.bgcolor} 61%, {colorMap.find((c) => {
        return c.id == cell.id;
      })?.bgcolor} 100%);
        {selected && isNeighbor(selected, cell)
        ? hovered && hovered.id == cell.id
          ? 'outline: .25rem dashed aqua;'
          : 'border: solid; border-color:aqua; border-width: .25rem;'
        : 'border: solid; border-color:black; border-width: .25rem;'}
        {selected && selected.id == cell.id
        ? 'outline: dotted .25rem aqua;'
        : ''}
        {!selected
        ? 'border: solid; border-color:black; border-width: .25rem;'
        : ''}
      "
      class="{selected && selected.id == cell.id ? 'jumpstart ' : ''}{hovered &&
      hovered.id == cell.id
        ? 'jumpend '
        : ''}"
      ondragover={(e) => handleDragOver(e, cell)}
      ondragenter={(e) => handleDragEnter(e, cell)}
      ondragleave={(e) => handleDragLeave(e, cell)}
      ondrop={(e) => handleDropEvent(e, cell)}
      onmousedown={(e) => {
        if (
          cell.occupant &&
          cell.occupant.team.id == (currentPlayer ? currentPlayer.id : true) &&
          pieceMoved
            ? cell.occupant.moved
            : true
        ) {
          e.stopPropagation();
          if (e.button > 1) {
            selected = null;
            jumpStart = null;
          } else if (selected && selected.id == cell.id) {
            selected = null;
            jumpStart = null;
          } else {
            selected = cell;
            jumpStart = e.currentTarget;
          }
        }
      }}
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        style="display:flex; flex-direction:column; align-items:center; justify-content:center; background-color: none;"
      >
        {#if cell.occupant}
          <div
            style="
            height: {scalar / 3}px; 
            width: {scalar / 3}px; 
            border-radius: {scalar}px;
            background-color:{currentPlayer &&
            cell.occupant.team.id == currentPlayer.id &&
            pieceMoved &&
            !cell.occupant.moved
              ? `color(from ${cell.occupant.team.bgcolor} srgb r g b /.5 )`
              : cell.occupant.team.bgcolor};
            color: {cell.occupant.team.color};
            border: solid thick {cell.occupant.team.color};
            display:flex; justify-content:center; align-items:center;
            {selected &&
            selected.occupant &&
            selected.occupant.id == cell.occupant.id
              ? 'border-color:aqua;'
              : ''}
            "
            draggable={(currentPlayer && currentPlayer.id
              ? currentPlayer.id == cell.occupant.team.id
              : true) && (pieceMoved ? cell.occupant.moved : true)
              ? "true"
              : "false"}
            ondragstart={(e) => {
              handleDragStart(e);
            }}
            ondragend={(e) => {
              handleDragEnd(e);
            }}
          >
            {cell.occupant.strength}
          </div>
        {/if}
        {#if showDebugInfo}
          <p
            style="color:{colorMap.find((c) => {
              return c.id == cell.id;
            })?.color}; margin:1px; padding: 0px;"
          >
            {cell.id} | ownd: {cell.owner}
          </p>
          <pre
            style="color:{colorMap.find((c) => {
              return c.id == cell.id;
            })
              ?.color}; margin: 0px; padding: 0px; font-size: x-small;">({cell.x},{cell.y},{cell.z})</pre>
        {/if}
      </div>
    </button>
  {/each}
</div>

<style>
  .jumpstart {
    transition: all 100ms;
    transform: scale(1.15, 1.15);
  }

  .jumpend {
    outline-style: dotted;
    animation: pulse 150ms infinite alternate;
  }

  .rolling {
    animation: jiggle 90ms ease-out infinite alternate;
  }
  .useopenin {
    animation: openin 300ms;
  }

  th {
    text-align: left;
  }
  @keyframes jiggle {
    from {
      transform: rotate(5deg);
    }
    to {
      transform: rotate(-5deg);
    }
  }

  @keyframes openin {
    from {
      width: 0px;
    }
    to {
      width: 800px;
    }
  }

  @keyframes spin {
    from {
      rotate: (5deg);
    }
    to {
      rotate: (-5deg);
    }
  }

  @keyframes pulse {
    from {
      outline-offset: 0px;

      transform: rotate(-5deg);
    }
    to {
      outline-offset: 6px;
      transform: rotate(5deg);
    }
  }
</style>
