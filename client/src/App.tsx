import { createTRPCProxyClient, createWSClient, httpLink, splitLink, wsLink } from "@trpc/client";
import { AppRouter } from "../../server/index";
import { FormEvent, useEffect, useState } from "react";

const wsClient = createWSClient({
  url: `ws://localhost:8000`,
});

const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsLink({ client: wsClient }),
      false: httpLink({ url: `http://localhost:8000` }),
    }),
  ],
});

type Message = {
  text: string;
  _id: string;
};

const App = () => {
  const [value, setValue] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    trpcClient.onNewMessage.subscribe(undefined, {
      onData: (newMessage) => setMessages((currMessages) => [...currMessages, newMessage]),
    });

    trpcClient.sayHello.query().then((res) => {
      console.log(res);
    });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await trpcClient.addNewMessage.mutate({ text: value });
    setValue("");
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input type="text" value={value} onChange={(e) => setValue(e.target.value)} />
        <button>Send</button>
      </form>

      {messages.map((message) => (
        <p key={message._id}>{message.text}</p>
      ))}
    </div>
  );
};

export default App;
