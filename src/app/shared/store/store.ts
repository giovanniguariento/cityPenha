import { Injectable } from "@angular/core";
import { BehaviorSubject, map, Observable } from "rxjs";

export interface AppData {
  name: string;
  description: string;
}

export interface StoreState {
  data: AppData;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class StoreData {
  private subject = new BehaviorSubject<StoreState>({
    data: {
      name: '',
      description: ''
    }
  });

  private store = this.subject.asObservable();

  get value(): StoreState {
    return this.subject.value;
  }

  set(name: string, state: unknown): void {
    this.subject.next({
      ...this.value,
      [name]: state,
    });
  }

  public getData(): Observable<AppData> {
    return this.store.pipe(map((store) => store.data));
  }
}