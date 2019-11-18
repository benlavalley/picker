import { WebApp } from 'meteor/webapp';
import { PickerImp } from './implementation';

export const Picker = new PickerImp();
WebApp.rawConnectHandlers.use(function(req, res, next) {
  Picker._dispatch(req, res, next);
});
