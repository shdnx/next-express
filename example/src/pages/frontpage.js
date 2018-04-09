import React from "react";

export default function FrontPage({ url: { query: data } }) {
  console.log("FrontPage data: ", data);

  return (
    <React.Fragment>
      <h1>Hello world</h1>
      <p>{data.content}</p>
    </React.Fragment>
  );
};
