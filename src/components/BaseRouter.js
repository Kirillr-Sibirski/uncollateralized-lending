import { Routes, Route } from "react-router-dom";
import Home from "./Home";

export const BaseRouter = () => {
  
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
};
