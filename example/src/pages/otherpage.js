import React from "react";
import Link from "next/link";

// OtherPage doesn't need to be decorated with nextpress/page, since it doesn't need any server data.

export default function OtherPage() {
  return (
    <div>
      <h1>Other page</h1>
      <p>Here's another page, so you can test that the main page requests data correctly using fetch() when it's navigated to, and it's all done seemlessly.</p>
      <p>
        &laquo;{" "}
        <Link href="/?from=otherpage">
          <a>Back to frontpage</a>
        </Link>
      </p>
    </div>
  );
};
