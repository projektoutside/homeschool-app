export class GameRouter {
    constructor(onChange) {
        this.onChange = typeof onChange === 'function' ? onChange : () => { };
        this.screen = 'menu';
        this.params = {};
    }

    go(screen, params = {}) {
        this.screen = screen;
        this.params = { ...params };
        this.onChange(this.getState());
    }

    getState() {
        return {
            screen: this.screen,
            params: { ...this.params }
        };
    }
}
