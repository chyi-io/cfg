export default function App(
  { Component }: { Component: preact.FunctionComponent },
) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Chyi CFG</title>
        <link rel="icon" type="image/png" href="/chyi-icon.png" />
      </head>
      <body class="bg-gray-50 text-gray-900 antialiased">
        <Component />
      </body>
    </html>
  );
}
