import { Component, OnInit } from '@angular/core';
import { StoreData } from '../../shared/store/store';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  standalone: true,
  styleUrl: './home.scss'})
export class Home implements OnInit {

  constructor(private store : StoreData) {}

  ngOnInit(): void {
    this.store.getData().subscribe((data) => { console.log(data)});
  }

}
