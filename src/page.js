export async function fetchServerData(ctx) {
  const { req, pathname, query } = ctx;

  let data;
  if (req) {
    // if we're on the server, then the data was already fetched by the Express route handler, and has been passed here via the 'query'
    data = query;
  } else {
    // otherwise we're on the client, query the data via AJAX
    const response = await fetch(pathname, {
      // TODO: we shouldn't hardcode "GET" here - on the server side, the request method may be something else
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    data = await response.json();
  }

  return data;
};

export function dataFetchingPage(Page) {
  const orgGetInitialProps = Page.getInitialProps || null;

  Page.getInitialProps = async ctx => {
    const data = await fetchServerData(ctx);

    if (orgGetInitialProps) {
      // TODO: ?
      ctx.query = data;
      return await orgGetInitialProps(ctx);
    }

    return data;
  };

  return Page;
};
