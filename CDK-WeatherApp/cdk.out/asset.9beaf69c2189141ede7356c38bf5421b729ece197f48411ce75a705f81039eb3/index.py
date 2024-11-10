import sys, os
import json, time
from botocore.vendored import requests
import pandas as pd
from datetime import datetime
import boto3
import matplotlib.pyplot as plt
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    print("Hello from lambda")