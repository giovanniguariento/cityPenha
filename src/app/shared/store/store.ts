import { BehaviorSubject, map, Observable } from "rxjs";

export interface StoreState {
  data: any;
}

export class StoreData {
  private subject = new BehaviorSubject<StoreState>({
    data: {}
  });

  private store = this.subject.asObservable();

  get value() {
    return this.subject.value;
  }

  set(name: string, state: unknown) {
    this.subject.next({
      ...this.value,
      [name]: state,
    });
  }

  public getData(): Observable<any> {
    return this.store.pipe(map((store) => store.data));
  }

}