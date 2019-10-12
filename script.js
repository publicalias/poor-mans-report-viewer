"use strict";

//library

const cycleItems = (arr, val, delta = 1) => {

  //cycle through an array of items

  const i = arr.indexOf(val);
  const l = arr.length;

  const next = ((i === -1 && Math.sign(delta) !== 1 ? 0 : i) + delta) % l;

  return arr[next >= 0 ? next : l + next];

};

const initDragItem = (DOMItem, data, fn) => {

  //make an item a drag and drop target

  const handleDragStart = (event) => {
    event.dataTransfer.setData("text/plain", data);
  };

  const handleDragOver = (event) => {
    event.preventDefault(); //necessary
  };

  const handleDrop = (event) => {
    event.preventDefault();
    fn(event.dataTransfer.getData("text/plain"), data);
  };

  DOMItem.setAttribute("draggable", "true");

  DOMItem.addEventListener("dragstart", handleDragStart);
  DOMItem.addEventListener("dragover", handleDragOver);

  DOMItem.addEventListener("drop", handleDrop);

};

const initSort = (from, to) => {

  //sort keys according to a predefined order

  const map = to.map((e) => from.indexOf(e));

  return (obj) => Object
    .entries(obj)
    .reduce((acc, e, i) => {

      acc[map.indexOf(i)] = e;

      return acc;

    }, [])
    .reduce((acc, [key, val]) => {

      acc[key] = val;

      return acc;

    }, {});

};

const initTabGroup = (group) => {

  //manage tab index for a group of elements

  const DOMGroup = document.querySelectorAll(group);

  const handleFocus = (delta, value) => {

    const list = Object.values(DOMGroup);

    const last = list.find((e) => e.getAttribute("tabindex") === "0");
    const next = value || cycleItems(list, last, delta);

    last.setAttribute("tabindex", "-1");

    next.focus();
    next.setAttribute("tabindex", "0");

  };

  const handleClick = (event) => {
    handleFocus(null, event.target);
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        handleFocus(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        handleFocus(-1);
    }
  };

  DOMGroup.forEach((e, i) => {

    e.setAttribute("tabindex", i === 0 ? "0" : "-1");

    e.addEventListener("click", handleClick);
    e.addEventListener("keydown", handleKeyDown);

  });

};

const kebabCase = (str) => str.toLowerCase().replace(/\s/g, "-");

const store = (key, val) => {

  //get/set local storage values

  const get = () => localStorage[key] && JSON.parse(localStorage[key]).val;
  const set = (val) => {
    localStorage[key] = JSON.stringify({ val });
  };

  if (val !== undefined) {
    set(typeof val === "function" ? val(get()) : val);
  }

  return get();

};

//state

const labels = store("labels");

const state = {

  start: {
    file: null,
    reader: new FileReader()
  },

  end: {
    file: null,
    reader: new FileReader()
  },

  labels: {

    id: labels ? labels.id : "",
    quantity: labels ? labels.quantity : "",

    delta: ""

  },

  dragged: null,
  sorted: null,

  loading: 0

};

//selectors

const DOMLoading = document.querySelector(".js-toggle-loading-state");

const DOMInput = document.querySelector(".js-toggle-input");
const DOMOutput = document.querySelector(".js-toggle-output");

const DOMFileStart = document.querySelector(".js-input-file-start");
const DOMFileEnd = document.querySelector(".js-input-file-end");

const DOMTextID = document.querySelector(".js-input-text-id");
const DOMTextQuantity = document.querySelector(".js-input-text-quantity");

const DOMSubmit = document.querySelector(".js-submit-input");

const DOMRenderHead = document.querySelector(".js-render-head");
const DOMRenderBody = document.querySelector(".js-render-body");

//app logic

const diffAndFilter = (start, end) => {

  /*
    get the difference between two files
    row/column order doesn't matter
    missing/extra rows are treated as zero quantity
    missing/extra columns are ignored
  */

  const { labels: { id, quantity, delta } } = state;

  let head = start.head.slice();

  head.unshift(...head.splice(head.indexOf(id), 1));

  head = head.filter((e) => end.head.includes(e));

  if (!head.length) {
    throw Error("The files are incompatible.");
  } else if (!head.includes(id) || !head.includes(quantity)) {
    throw Error("The labels are incompatible with the files.");
  }

  for (const e of [start.head, end.head, head]) {
    e.push(delta);
  }

  const sortStart = initSort(start.head, head);
  const sortEnd = initSort(end.head, head);

  const changed = Object.entries(start.body).reduce((acc, [key, val]) => {

    const diff = end.body[key] || { [quantity]: 0 };

    return val[quantity] === diff[quantity] ? acc : acc.concat(sortStart({
      ...val,
      [delta]: diff[quantity] - val[quantity],
      [quantity]: diff[quantity]
    }));

  }, []);

  const added = Object
    .entries(end.body)
    .reduce((acc, [key, val]) => start.body[key] ? acc : acc.concat(sortEnd({
      ...val,
      [delta]: val[quantity]
    })), []);

  return {
    head,
    body: changed.concat(added)
  };

};

const parseFile = (file) => {

  //convert files to lookup tables

  const [head, ...body] = file
    .split(/\r?\n/)
    .map((e) => e.split(/\t/).filter((e) => e !== ""))
    .filter((e) => e.length);

  const id = head.indexOf(state.labels.id);

  return {
    head,
    body: body.reduce((acc, e) => {

      acc[e[id]] = e.reduce((acc, e, i) => {

        acc[head[i]] = e;

        return acc;

      }, {});

      return acc;

    }, {})
  };

};

//view logic

const isLoading = (bool = false) => {

  //display a spinner when loading

  state.loading += bool ? 1 : -1;

  DOMLoading.classList.toggle("is-loading", state.loading);

};

const renderOutput = ({ head, body }) => {

  //display output as a sortable table

  const handleUpdate = () => {
    DOMRenderBody.innerHTML = `${body.map((e) => `
      <tr class="c-table__row">
        ${Object.entries(e).map(([key, val], i) => head.includes(key) ? i === 0 ? `
          <th class="c-table__cell" scope="row">${val}</th>
        ` : `
          <td class="c-table__cell">${val}</td>
        ` : "").join("")}
      </tr>
    `).join("")}`;
  };

  const handleDrag = (from, to) => {

    const next = head.slice();

    next.splice(next.indexOf(to), 0, ...next.splice(next.indexOf(from), 1));

    const sort = initSort(head, next);

    state.dragged = from;

    renderOutput({
      head: next,
      body: body.map(sort)
    });

    state.dragged = null;

  };

  const handleSort = (key) => () => {

    if (!state.dragged) {

      body.sort((a, b) => {

        const [one, two] = key === state.sorted ? [b, a] : [a, b];

        return one[key] < two[key] ? -1 : one[key] > two[key] ? 1 : 0;

      });

      state.sorted = key === state.sorted ? null : key;

    }

    handleUpdate();

  };

  DOMRenderHead.innerHTML = `
    <tr class="c-table__row">
      ${head.map((e) => `
        <th class="c-table__cell--sortable" scope="col">
          <button
            class="c-table__button js-sortable js-sortable-${kebabCase(e)}"
          >
            &#8691; ${e}
          </button>
        </th>
      `).join("")}
    </tr>
  `;

  initTabGroup(".js-sortable");

  handleSort(state.labels.delta)();

  for (const e of head) {

    const DOMItem = document.querySelector(`.js-sortable-${kebabCase(e)}`);

    initDragItem(DOMItem, e, handleDrag);

    if (e === state.dragged) {
      DOMItem.click(); //initialize focus
    }

    DOMItem.addEventListener("click", handleSort(e));

  }

};

const toggleView = (input = false, output = false) => {

  //switch views

  DOMInput.classList.toggle("is-hidden", !input);
  DOMOutput.classList.toggle("is-hidden", !output);

};

//events

const handleChangeFile = (key) => (event) => {

  //read file

  const [file] = event.target.files;

  if (file) {
    state[key].reader.readAsText(file);
  } else {
    state[key].file = null;
  }

  isLoading(true);

};

const handleChangeText = (key) => (event) => {

  //set label

  state.labels[key] = event.target.value;

};

const handleLoad = (key) => (event) => {

  //save file

  state[key].file = event.target.result;

  isLoading();

};

const handleSubmit = (event) => {

  //parse input files and render output

  event.preventDefault();

  state.labels.delta = `${state.labels.quantity} Δ`;

  store("labels", () => ({
    id: DOMTextID.value,
    quantity: DOMTextQuantity.value
  }));

  try {

    const start = parseFile(state.start.file);
    const end = parseFile(state.end.file);

    const diff = diffAndFilter(start, end);

    renderOutput(diff);

    toggleView(false, true);

  } catch (err) {

    console.error(err);

    alert("There was a problem with one of the files. Check the developer console for more details.");

    toggleView(true);

  }

};

//initialize app

DOMTextID.value = state.labels.id;
DOMTextQuantity.value = state.labels.quantity;

state.start.reader.addEventListener("load", handleLoad("start"));
state.end.reader.addEventListener("load", handleLoad("end"));

DOMFileStart.addEventListener("change", handleChangeFile("start"));
DOMFileEnd.addEventListener("change", handleChangeFile("end"));

DOMTextID.addEventListener("change", handleChangeText("id"));
DOMTextQuantity.addEventListener("change", handleChangeText("quantity"));

DOMSubmit.addEventListener("submit", handleSubmit);
