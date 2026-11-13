import importlib.util
from pathlib import Path
from time import time
import unittest
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('optimizer_contract',root/'custom_components/pv_lab/contract.py')
contract=importlib.util.module_from_spec(spec);spec.loader.exec_module(contract)
class OptimizerTests(unittest.TestCase):
 def payload(self):
  return {'energyOptimizer':{'calculatedAt':time()*1000,'validUntil':time()*1000+60000,'status':'harmonogram gotowy','mode':'hourly','schedule':{'cost':.42,'devices':1},'devices':[{'id':'dishwasher','name':'Zmywarka','status':'gotowe','scheduled':{'start':time()*1000+600000,'end':time()*1000+3600000,'cost':.42},'cheapest':{'cost':.4},'pvBest':{'cost':.5}}]}}
 def test_specs_and_cost_units_mapping(self):
  specs=[s for s in contract.sensor_specs() if s['kind'].startswith('optimizer_')];self.assertEqual(len(specs),27)
  p=self.payload();value,attrs=contract.read_sensor(p,{'kind':'optimizer_total_cost'});self.assertEqual(value,.42)
  value,attrs=contract.read_sensor(p,{'kind':'optimizer_start','device_index':0});self.assertIsInstance(value,float);self.assertEqual(attrs['device_name'],'Zmywarka');self.assertEqual(attrs['mode'],'hourly')
 def test_missing_or_stale_plan_never_advertises_a_start(self):
  p=self.payload();p['energyOptimizer']['validUntil']=1
  self.assertIsNone(contract.read_sensor(p,{'kind':'optimizer_start','device_index':0})[0]);self.assertEqual(contract.read_sensor(p,{'kind':'optimizer_status'})[0],'rekomendacja nieaktualna')
  self.assertIsNone(contract.read_sensor(self.payload(),{'kind':'optimizer_start','device_index':7})[0]);self.assertIsNone(contract.read_sensor({}, {'kind':'optimizer_total_cost'})[0])
if __name__=='__main__':unittest.main()
