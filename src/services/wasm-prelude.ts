const unimplement = () => {
  throw Error("unimplment!");
};

const bridgeAdapter = {
  next_file_chunk: unimplement as any,
  send_ret: unimplement as any,
};

const _Bridge = ((globalThis as any)._Bridge = {} as any);

const defineBridgeToAdapter = (name: keyof typeof bridgeAdapter) => {
  _Bridge[name] = (...args: any[]) => {
    return bridgeAdapter[name](...args);
  };
};
Object.keys(bridgeAdapter).map((name: string) => {
  defineBridgeToAdapter(name as keyof typeof bridgeAdapter);
});

export { bridgeAdapter };
