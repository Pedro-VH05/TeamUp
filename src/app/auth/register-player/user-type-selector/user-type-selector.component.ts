import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-type-selector',
  templateUrl: './user-type-selector.component.html',
  styleUrls: ['./user-type-selector.component.scss']
})
export class UserTypeSelectorComponent {
  constructor(private router: Router) {}

  selectType(type: 'player' | 'team') {
    this.router.navigate([`/register/${type}`]);
  }
}
