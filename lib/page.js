// Turn the given Next.js page component into one that fetches its initial props from the server (communicating e.g. with an endpoint defined using nextExpress.pageRoute).
// TODO: support using this as a class decorator?
export default function nextExpressPage(Page) {
  const orgGetInitialProps = Page.getInitialProps;

  if (orgGetInitialProps) {
    Page.getInitialProps = ctx => {
      const serverDataFetchFunc = () => fetchServerData(ctx);
      return orgGetInitialProps(ctx, serverDataFetchFunc);
    };
  } else {
    Page.getInitialProps = fetchServerData;
  }

  return Page;
};

async function fetchServerData(ctx) {
  let data;

  if (ctx.req) {
    // if we're on the server, then the data was already fetched by the Express route handler, and has been passed here via ctx.query
    data = ctx.query._nextExpressData;
    delete ctx.query._nextExpressData;
  } else {
    // otherwise we're on the client, fetch the data via AJAX
    const response = await fetch(ctx.asPath, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    data = await response.json();
  }

  return data;
};
