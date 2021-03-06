import MenuView from '../ui/views/menu';
import EmptyView from '../ui/views/empty';
import GameView from '../ui/views/game';
import AboutView from '../ui/views/about';
import LeadersView from '../ui/views/leaders';
import LoginView from '../ui/views/login';
import SignupView from '../ui/views/signup';
import LobbyView from '../ui/views/lobby';

/**
 * Changes the page according to url hash.
 */
export default class Router {
    constructor(serviceLocator) {
        this.serviceLocator = serviceLocator;

        this._routerGroups = [
            new MenuRouterGroup(this.serviceLocator),
            new GameRouterGroup(this.serviceLocator),
        ];
        this._currentRouterGroup = null;
    }

    /**
     * Setups listeners and initializes the page.
     */
    init() {
        window.onpopstate = (event) => {
            const path = location.pathname;
            const routerGroup = this._routerGroups.find(g => g.isPathOfGroup(path));

            if (this._currentRouterGroup !== routerGroup) {
                if (this._currentRouterGroup) {
                    this._currentRouterGroup.close();
                }
                this._currentRouterGroup = routerGroup;
                this._currentRouterGroup.open();
            }
            this._currentRouterGroup.revert(path, event.state);
        };

        this.changePage(location.pathname);
    }

    /**
     * Changes page block.
     *
     * @param path {String} Path part of the URL string
     * @param data
     */
    changePage(path, data = null) {
        const routerGroup = this._routerGroups.find(g => g.isPathOfGroup(path));

        if (this._currentRouterGroup !== routerGroup) {
            if (this._currentRouterGroup) {
                this._currentRouterGroup.close();
            }
            this._currentRouterGroup = routerGroup;
            this._currentRouterGroup.open(data);
        }
        const changeData = this._currentRouterGroup.change(path, data);
        history.pushState(changeData.state, changeData.title, path);
    }
}

/* tslint:disable:no-empty */
class RouterGroup {
    constructor(serviceLocator) {
        this.serviceLocator = serviceLocator;
    }

    /**
     * @param path {String} Url path
     * @return {bool} True if path matches this group, else false.
     */
    isPathOfGroup(path) {
    }

    /**
     * Is executed when router switched to this group.
     */
    open() {
    }

    /**
     * Is executed when router changes paths.
     *
     * @param path {String} Url path
     * @param data
     * @return {Object} Change data
     */
    change(path, data = null) {
    }

    /**
     * Is executed when user goes back and forward in history.
     *
     * @param path {String} Url path
     * @param state {Object} State object saved from change data
     */
    revert(path, state) {
    }

    /**
     * Is executed when router matched another group and before router switched to it.
     */
    close() {
    }
}
/* tslint:enable */

class MenuRouterGroup extends RouterGroup {
    constructor(serviceLocator) {
        super(serviceLocator);

        this._routes = {
            '/': {
                viewClass: EmptyView,
                title: 'Glitchless',
            },
            '/about': {
                viewClass: AboutView,
                title: 'About',
            },
            '/leaders': {
                viewClass: LeadersView,
                title: 'Leaders',
            },
            '/login': {
                viewClass: LoginView,
                title: 'Login',
            },
            '/signup': {
                viewClass: SignupView,
                title: 'Sign up',
            },
            '/lobby': {
                viewClass: LobbyView,
                title: 'Lobby search',
            },
        };

        this._menuView = new MenuView(this.serviceLocator);
        this._modalSpan = null;
        this._currentModalView = null;
        this._modalViewCache = {};
    }

    isPathOfGroup(path) {
        return this._routes.hasOwnProperty(path) || path.startsWith('/lobby');
    }

    open() {
        const root = document.body;

        root.innerHTML = '';

        const menuSpan = document.createElement('span');
        root.appendChild(menuSpan);
        this._menuView.open(menuSpan);

        const modalSpan = document.createElement('span');
        root.appendChild(modalSpan);
        this._modalSpan = modalSpan;
    }

    change(path, data = null) {
        if (this._currentModalView) {
            this._currentModalView.close();
        }

        if (path.startsWith('/lobby')) {
            data = path.split('/')[2];
            path = '/lobby';
        }

        const viewClass = this._routes[path].viewClass;
        const title = this._routes[path].title;
        this._currentModalView = new viewClass(this.serviceLocator);
        this._currentModalView.open(this._modalSpan, data);

        const viewId = Math.random().toString();
        this._modalViewCache[viewId] = this._currentModalView;
        return {title, state: {viewId}};
    }

    revert(path, state) {
        if (this._currentModalView) {
            this._currentModalView.close();
        }

        if (state && state.viewId && this._modalViewCache.hasOwnProperty(state.viewId)) {
            this._currentModalView = this._modalViewCache[state.viewId];
            this._currentModalView.open(this._modalSpan);
        } else {
            this.change(path);
        }
    }

    close() {
        if (this._currentModalView) {
            this._currentModalView.close();
        }
        this._menuView.close();
        document.body.innerHTML = '';
    }
}

class GameRouterGroup extends RouterGroup {
    constructor(serviceLocator) {
        super(serviceLocator);
        this._view = null;
    }

    isPathOfGroup(path) {
        return path === '/play';
    }

    open(data = null) {
        this._view = new GameView(this.serviceLocator);
        this._view.open(document.body, data);
    }

    change() {
        return {title: 'Glitchless'};
    }

    //tslint:disable-next-line:no-empty
    revert() {
    }

    close() {
        this._view.close();
    }
}
