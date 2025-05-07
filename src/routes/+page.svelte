<script lang="ts">
  import { chinesecheckerboard } from "$lib/constan";
  import { onMount } from "svelte";

  let board = chinesecheckerboard();
  let spaces = $state(board);

  let picks: Map<number, Set<number>> = $state(new Map());
  let currentPick = $state(-1);

  async function setCenter(n: number) {
    currentPick = n;
    if (!picks.get(n)) {
      picks.set(n, new Set<number>());
    }
    (document.getElementById("" + n) as HTMLElement).style.backgroundColor =
      "blue";
    for (const j of picks.get(n) ?? []) {
      (document.getElementById("" + j) as HTMLElement).style.backgroundColor =
        "red";
    }
  }

  async function setNeighbor(n: number) {
    if (currentPick > -1 && currentPick != n) {
      if (!picks.get(currentPick)?.has(n)) {
        picks.get(currentPick)?.add(n);
        (document.getElementById("" + n) as HTMLElement).style.backgroundColor =
          "red";
      } else {
        picks.get(currentPick)?.delete(n);
        (document.getElementById("" + n) as HTMLElement).style.backgroundColor =
          "black";
      }
    }
  }

  async function handleClick(n: number) {
    if (currentPick == n) {
      currentPick = -1;
      console.log(
        Array.from(picks.values()).map((s) => {
          return Array.from(s).sort((a, b) => {
            return a - b;
          });
        })
      );
      let elems = document.getElementsByClassName("spot");
      for (const elem of elems) {
        (elem as HTMLElement).style.backgroundColor = "black";
      }
      return;
    }

    if (currentPick > -1) {
      setNeighbor(n);
    } else {
      setCenter(n);
    }
  }

  onMount(() => {
    for (let i = 1; i < spaces.length - 1; i++) {
      for (let j = 1; j < spaces[i].length - 1; j++) {}
    }
  });
</script>

<div style="display:flex; justify-content:center;">
  <div
    style="display:flex; flex-direction:row; justify-content:center;gap:1.25rem; width:fit-content; padding: .5rem;"
  >
    {#each board as row}
      <div
        style="display:flex; flex-direction:column; gap: 1rem; justify-content:center;gap:1.25rem;"
      >
        {#each row as col}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            id={"" + col.id}
            class="spot"
            style="width:3rem; height: 3rem; border-radius:2rem; background-color:black; display:flex; justify-content: center;"
            onclick={() => {
              handleClick(col.id);
            }}
          >
            <p style="color: white;">{col.id}</p>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
