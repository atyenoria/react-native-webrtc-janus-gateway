const initialState = {
  test: "test",       // true after first configure
};

function App(state = initialState, action) {
  console.log(action)
  switch (action.type) {
    case "test":
      return {
        ...state,
        test: action.test,
      };
    default:
      return state;
  }
}

export default App;



