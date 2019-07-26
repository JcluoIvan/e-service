import { Router } from 'express';


class TT {

}



// tslint:disable-next-line:max-classes-per-file
export default class CustomRouter {
    private router: Router;

    get expressRouter () {
        return this.router;
    }

    constructor(router?: Router) {
        this.router = router || Router();
    }




}
