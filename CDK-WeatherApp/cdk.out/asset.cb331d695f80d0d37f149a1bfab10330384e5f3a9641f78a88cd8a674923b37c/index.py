import os
import boto3
from bokeh.plotting import figure
from bokeh.io.export import get_screenshot_as_png

# Initialize S3 client
s3 = boto3.client("s3")

def handler(event, context):
    # Bokeh Plot
    plot = figure(title="Simple Bokeh Plot", x_axis_label="x", y_axis_label="y")
    plot.line([1, 2, 3, 4, 5], [2, 5, 8, 2, 7], legend_label="Test Line", line_width=2)

    # Export plot as PNG
    image = get_screenshot_as_png(plot)

    # Upload image to S3
    bucket_name = os.getenv("BUCKET_NAME")
    image_key = "plot.png"
    s3.put_object(Bucket=bucket_name, Key=image_key, Body=image)

    return {"statusCode": 200, "body": f"Image uploaded to s3://{bucket_name}/{image_key}"}
