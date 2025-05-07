<script lang="ts">
  import { betterCCB, type Space } from "$lib/constan";
  import { onMount } from "svelte";

  let showDebugInfo = $state(false);

  const minScalar = 50;

  let board = $state(betterCCB());
  let scalar = $state(minScalar);
  let viewerH = $state(1080);
  let viewerW = $state(1920);
  let defaultSpaceColor = "white";
  let colorMap: { id: number; bgcolor: string; color: string }[] = $state([]);
  let selected: null | Space = $state(null);
  let hovered: null | Space = $state(null);
  let jumpStart: null | HTMLElement = $state(null);
  let dropTarget: null | HTMLElement = $state(null);
  let range = $state(1);
  let playerCount = $state(2);

  function getProjection(cell: {
    id: number;
    x: number;
    y: number;
    z: number;
  }) {
    return {
      w: viewerW / 2 + (scalar / 3) * (cell.x - cell.y / 2 - cell.z / 2),
      h: viewerH / 2 + ((scalar / 3) * (cell.y - cell.z) * Math.sqrt(3)) / 2,
    };
  }

  onMount(() => {
    const body = document.body;
    const html = document.documentElement;
    console.log(board);
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
    window.addEventListener("resize", () => {
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
    });
    const homeSpaces: { id: number; bgcolor: string; color: string }[] = [];

    for (const team of Array.from(board.teams)) {
      team[1].homeSpaces.map((cell) => {
        homeSpaces.push({
          id: cell,
          color: team[1].color,
          bgcolor: team[1].bgcolor,
        });
      });
    }

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
        });
      }
    }
    colorMap = homeSpaces;
  });

  function resetBoard(numPlayers: number) {
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
      for (const space of board.spaces) {
        if (team?.homeSpaces.includes(space.id)) {
          space.occupant = {
            id: space.id,
            strength: Math.floor(Math.random() * 5) + 1,
            team: team,
          };
        }
      }
    }
  }

  function isNeighbor(cell1: Space, cell2: Space) {
    let r = range;
    if (cell1 == cell2) return false;
    if (cell1 && cell1.occupant && cell1.occupant.strength) {
      r = cell1.occupant.strength;
    }
    let xn = Math.abs(cell1.x - cell2.x) < r + 1 ? 1 : 0;
    let yn = Math.abs(cell1.y - cell2.y) < r + 1 ? 1 : 0;
    let zn = Math.abs(cell1.z - cell2.z) < r + 1 ? 1 : 0;
    return xn + yn + zn > 1 && xn + yn + zn != 2 && xn + yn + zn != 0;
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
    }
  }

  async function handleDragEnd(
    e: DragEvent & {
      currentTarget: EventTarget & HTMLElement;
    }
  ) {
    selected = null;

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
      } else if (
        cell.occupant &&
        cell.occupant.team.id != selected.occupant!.team.id
      ) {
        hovered = cell;
        e.preventDefault();
        if (dropTarget != e.currentTarget) {
          dropTarget = e.currentTarget;
        }
      }
    }
  }

  function extractNums(elem: HTMLElement) {
    return {
      left: parseFloat(elem.computedStyleMap().get("left")?.toString() ?? "0"),
      top: parseFloat(elem.computedStyleMap().get("top")?.toString() ?? "0"),
      centerX:
        parseFloat(elem.computedStyleMap().get("left")?.toString() ?? "0") +
        parseFloat(elem.computedStyleMap().get("width")?.toString() ?? "0"),
      centerY:
        parseFloat(elem.computedStyleMap().get("top")?.toString() ?? "0") +
        parseFloat(elem.computedStyleMap().get("height")?.toString() ?? "0"),
      width: parseFloat(
        elem.computedStyleMap().get("width")?.toString() ?? "0"
      ),
      height: parseFloat(
        elem.computedStyleMap().get("height")?.toString() ?? "0"
      ),
    };
  }

  async function handleDropEvent(e: DragEvent, cell: Space) {
    console.log("dropp occured on cell: ", JSON.stringify(cell));
    if (selected && selected.occupant) {
      selected.occupant.strength =
        selected.occupant.strength - calcJumpEnergy(selected, cell);
      selected.occupant.strength =
        selected.occupant.strength < 2 ? 1 : selected.occupant.strength;
      cell.occupant = selected.occupant;
      selected.occupant = null;
      selected = null;
    }
  }

  function calcJumpEnergy(start: Space, end: Space) {
    let xn = Math.abs(start.x - end.x);
    let yn = Math.abs(start.y - end.y);
    let zn = Math.abs(start.z - end.z);
    let tot = Math.max(xn, yn, zn);
    console.log(xn, yn, zn, tot);
    return tot;
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  style="display:flex; flex-direction:column; justify-content:center; margin-left: 10vw; width: 15vw; color: lightsteelblue;
    font-family: monospace;
    font-size: x-large;"
>
  <span
    ><label>Debug Mode: </label><input
      type="checkbox"
      bind:checked={showDebugInfo}
    /></span
  >
  <span><label>Range</label> <span style="float:right;"> {range}</span></span>
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
        ? 'outline: .25rem dashed aqua;'
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
            background-color:{cell.occupant.team.bgcolor};
            color: {cell.occupant.team.color};
            border: solid thick {cell.occupant.team.color};
            display:flex; justify-content:center; align-items:center;
            {selected &&
            selected.occupant &&
            selected.occupant.id == cell.occupant.id
              ? 'border-color:aqua;'
              : ''}
            "
            draggable="true"
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
            {cell.id}
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
    animation: pulse 300ms infinite alternate;
  }

  @keyframes spin {
    from {
      rotate: (0deg);
    }
    to {
      rotate: (360deg);
    }
  }

  @keyframes pulse {
    from {
      outline-offset: 0px;
    }
    to {
      outline-offset: 10px;
    }
  }
</style>
