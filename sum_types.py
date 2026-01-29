from enum import Enum

class CSVExportStatus(Enum):
    PENDING = 1
    PROCESSING = 2
    SUCCESS = 3
    FAILURE = 4

def get_csv_status(status, data):
    match(status):
        case (CSVExportStatus.PENDING):
            return parse_pending(data)
        case (CSVExportStatus.PROCESSING):
            return parse_processing(data)
        case (CSVExportStatus.SUCCESS):
            return ("Success!", data)
        case (CSVExportStatus.FAILURE):
            return ("Unknown error, retrying...", parse_processing(parse_pending(data)[1])[1])
        case _:
            raise Exception("unknown export status")

def parse_pending(data):
   return ("Pending...", list(map(lambda nested_list: list(map(str, nested_list)), data)))
    
def parse_processing(data):
    return ("Processing...", "\n".join(map(lambda nested_list: ','.join(nested_list), data)))
    