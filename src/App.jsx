import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Amazon Operations Console (AMZOPS) is a web-based application designed
          to provide Amazon sellers with a comprehensive suite of tools and
          features to manage their online businesses effectively.
        </p>
      </div>
      <p className="read-the-docs">
        The console offers a user-friendly interface that allows sellers to
        monitor their sales performance, manage inventory, track orders, and
        access various analytics and reporting features. With AMZOPS, sellers
        can streamline their operations, optimize their listings, and make
        informed decisions to grow their Amazon business.
      </p>
    </>
  );
}

export default App;
