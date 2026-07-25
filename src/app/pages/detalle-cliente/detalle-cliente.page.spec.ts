import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetalleClientePage } from './detalle-cliente.page';

describe('DetalleClientePage', () => {
  let component: DetalleClientePage;
  let fixture: ComponentFixture<DetalleClientePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalleClientePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
