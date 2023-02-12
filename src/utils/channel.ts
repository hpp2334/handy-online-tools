type RecvFn<T> = (data: T) => void

export interface Sender<T> {
    send: (data: T) => void
}

export interface Receiver<T> {
    _fn: RecvFn<T> | null;
    recv: (fn: RecvFn<T>) => void
    toPromise: () => Promise<T>
    close: () => void
}

export function buildChannel<T>() {
    const receiverSet = new Set<Receiver<T>>();
    function _notify(data: T) {
        for (const receiver of receiverSet) {
            receiver._fn?.(data)
        }
    }
    function createReceiver(): Receiver<T> { 
        return {
            _fn: null,
            recv(fn: RecvFn<T>) {
                this._fn = fn;
                receiverSet.add(this);
            },
            toPromise(): Promise<T> {
                let res: any = null;
                const pr = new Promise<any>((_res) => {
                    res = _res;
                });
                this.recv(res);
                return pr;
            },
            close() {
                receiverSet.delete(this);
            },
        }
    }
    function createSender(): Sender<T> {
        return {
            send(data: T) {
                _notify(data);
            }
        }
    }

    return [createSender(), createReceiver()] as const
}